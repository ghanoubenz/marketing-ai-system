import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are a senior B2B landing page copywriter who has written high-converting pages for companies like Salesforce, HubSpot, Stripe, and Monday.com.

You write landing page copy that is:
- conversion-focused and buyer-aware
- specific to the approved offer and ICP (no generic filler)
- clear enough for a busy decision-maker to understand in 30 seconds
- structured for modern B2B SaaS-style landing pages
- free from AI hype, buzzwords, or vague promises
- directly tied to real buyer pain and business outcomes
- scannable with short paragraphs, bullet points, and clear CTAs

You receive an approved product strategy as input. Use it as your source of truth. Do not invent new positioning — amplify what was already approved.

PROOF RULES: NEVER fabricate testimonials, client logos, or statistics. If the strategy includes proof points, use them. If not, use placeholder format: "[TESTIMONIAL: ask a past client for a quote about X]" or "[METRIC: track and insert your actual conversion rate]". Honest placeholders build trust — fake social proof destroys it.

Respond with ONLY valid JSON matching the exact schema provided. No markdown, no code fences, no explanation outside the JSON.`

const OUTPUT_SCHEMA = `{
  "agent_name": "Landing Page Agent",
  "status": "needs_review",
  "summary": "<1-2 sentence summary of the landing page approach>",
  "hero": {
    "headline": "<hero headline — clear, specific, outcome-driven>",
    "subheadline": "<supporting subheadline — expand on the value prop>",
    "primary_cta": "<primary button text>",
    "secondary_cta": "<secondary link text>"
  },
  "problem_section": {
    "title": "<section title>",
    "body": "<2-3 sentences describing the problem>",
    "pain_points": ["<pain 1>", "<pain 2>", "<pain 3>"]
  },
  "solution_section": {
    "title": "<section title>",
    "body": "<2-3 sentences describing the solution>",
    "key_benefits": ["<benefit 1>", "<benefit 2>", "<benefit 3>"]
  },
  "how_it_works": [
    { "step": 1, "title": "<step title>", "description": "<1 sentence>" },
    { "step": 2, "title": "<step title>", "description": "<1 sentence>" },
    { "step": 3, "title": "<step title>", "description": "<1 sentence>" }
  ],
  "what_you_get": ["<deliverable 1>", "<deliverable 2>", "<deliverable 3>"],
  "pricing_section": {
    "headline": "<pricing section headline>",
    "packages": [
      { "name": "<package name>", "price": "<price>", "features": ["<feature 1>", "<feature 2>"], "best_for": "<who this is for>" }
    ]
  },
  "proof_section": {
    "title": "<section title>",
    "body": "<1-2 sentences>",
    "proof_points": ["<proof 1>", "<proof 2>", "<proof 3>"]
  },
  "faq": [
    { "question": "<question>", "answer": "<concise answer>" }
  ],
  "final_cta": {
    "headline": "<closing headline>",
    "body": "<1-2 sentences creating urgency or clarity>",
    "button_text": "<final CTA button text>"
  },
  "recommended_next_action": "<what the operator should do next with this copy>",
  "requires_human": true,
  "confidence": 0.0
}`

function tryParseJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text) } catch { /* noop */ }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch { /* noop */ }
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch { /* noop */ }
  }

  return null
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  const body = await request.json()
  const projectId = body.project_id
  if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 })

  const { data: project, error: projError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (projError || !project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  if (!project.approved_offer) {
    return Response.json({
      error: 'This project has no approved strategy yet. Run and approve the Product Strategy Agent first.',
    }, { status: 400 })
  }

  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, name')
    .eq('name', 'Landing Page Agent')
    .single()

  if (!agent) {
    return Response.json({ error: 'Landing Page Agent not found in database.' }, { status: 500 })
  }

  await logActivity({
    user_id: userId,
    project_id: projectId,
    agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: `Landing Page Agent started for "${project.name}"`,
  })

  const positioning = project.approved_positioning as Record<string, string> | null
  const icp = project.approved_icp as Record<string, unknown> | null
  const pricing = project.approved_pricing as Record<string, string> | null

  const userMessage = `Generate complete landing page copy for this approved B2B offer.

APPROVED OFFER: ${project.approved_offer}

APPROVED POSITIONING:
- Category: ${positioning?.category || 'Not set'}
- Differentiation: ${positioning?.differentiation || 'Not set'}
- Why now: ${positioning?.why_now || 'Not set'}
- Proof angle: ${positioning?.proof_angle || 'Not set'}

APPROVED ICP:
- Primary: ${icp?.primary_icp || 'Not set'}
- Secondary: ${icp?.secondary_icp || 'Not set'}
- Buyer titles: ${Array.isArray(icp?.buyer_titles) ? (icp.buyer_titles as string[]).join(', ') : 'Not set'}
- Company size: ${icp?.company_size || 'Not set'}

APPROVED PRICING:
- Pilot: ${pricing?.pilot_price || 'Not set'}
- Standard: ${pricing?.standard_price || 'Not set'}
- Upsell: ${pricing?.upsell || 'Not set'}
- Logic: ${pricing?.pricing_logic || 'Not set'}

APPROVED CTA: ${project.approved_cta || 'Not set'}

PROJECT CONTEXT:
- Name: ${project.name}
- Description: ${project.description || 'Not provided'}
- Problem solved: ${project.problem_solved || 'Not specified'}
- Proof/background: ${project.proof_or_background || 'Not provided'}

${project.project_memory_summary ? `PROJECT MEMORY:\n${project.project_memory_summary}` : ''}

Write landing page copy that converts. Use the approved positioning and ICP — do not reinvent them.

Respond with ONLY the JSON matching this schema:
${OUTPUT_SCHEMA}`

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from AI')
    }

    const parsed = tryParseJSON(textBlock.text)
    if (!parsed) {
      await logActivity({
        user_id: userId,
        project_id: projectId,
        agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'Landing Page Agent returned invalid JSON',
        metadata: { raw_response: textBlock.text.slice(0, 500) },
      })
      return Response.json({
        error: 'AI returned invalid JSON. Please try again.',
        raw_preview: textBlock.text.slice(0, 300),
      }, { status: 422 })
    }

    const { data: savedMessage, error: saveError } = await supabaseAdmin
      .from('agent_messages')
      .insert({
        user_id: userId,
        project_id: projectId,
        agent_id: agent.id,
        title: `Landing Page: ${project.name}`,
        summary: (parsed.summary as string) || 'Landing page copy generated',
        message_type: 'content',
        priority: 'high',
        approval_level: 'needs_approval',
        status: 'needs_review',
        input_payload: {
          project_name: project.name,
          approved_offer: project.approved_offer,
          approved_cta: project.approved_cta,
        },
        output_payload: parsed,
        recommended_action: 'Review landing page copy and approve to save as content asset',
        requires_human: true,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : null,
      })
      .select()
      .single()

    if (saveError) {
      return Response.json({ error: 'Failed to save agent output: ' + saveError.message }, { status: 500 })
    }

    await logActivity({
      user_id: userId,
      project_id: projectId,
      agent_id: agent.id,
      event_type: 'agent.output_created',
      event_description: `Landing Page Agent completed for "${project.name}"`,
      metadata: { message_id: savedMessage.id, confidence: parsed.confidence },
    })

    return Response.json(savedMessage, { status: 201 })

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    await logActivity({
      user_id: userId,
      project_id: projectId,
      agent_id: agent.id,
      event_type: 'agent.output_failed',
      event_description: `Landing Page Agent failed: ${errorMessage}`,
      metadata: { error: errorMessage },
    })

    return Response.json({ error: `AI API call failed: ${errorMessage}` }, { status: 500 })
  }
}
