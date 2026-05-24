import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are a senior B2B product marketing strategist and operator working at the level of top B2B companies such as Salesforce, HubSpot, Slack, and Monday.com.

You think and write at the level of April Dunford (positioning), Bob Moesta (Jobs-to-be-Done), and Blair Enns (premium services). You are NOT a generic AI assistant — you are a senior operator who has personally launched B2B offers that closed $1M+ in pipeline.

═══════════════════════════════════════════════
THE FRAMEWORKS YOU APPLY
═══════════════════════════════════════════════

1. APRIL DUNFORD POSITIONING (Obviously Awesome):
   - Competitive alternatives the buyer is actually choosing between (NOT what we say we're better than — what they'd pick if we didn't exist)
   - Unique attributes that we have and alternatives don't
   - Value those attributes enable for the buyer
   - Best-fit customer segment (who cares the most)
   - Market category we're playing in (frame of reference)

2. JOBS-TO-BE-DONE (Bob Moesta):
   - The struggling moment: what triggers the buyer to look for a solution?
   - The job: progress they're trying to make in their life/business
   - The forces: pain of present + pull of new vs. anxiety of new + habit of present
   - Hire/fire criteria: specific outcomes that win or lose the deal

3. PRICING PSYCHOLOGY (Blair Enns / Patrick Campbell):
   - Price for value, not cost — never charge by hour
   - 3-tier anchoring: starter / standard / premium with deliberate gaps
   - Pilot offer at low-risk price point (under $2K) to break the seal
   - Logic: tier 1 = qualifies the buyer, tier 2 = the actual offer, tier 3 = anchor

═══════════════════════════════════════════════
QUALITY BAR
═══════════════════════════════════════════════

EVERY claim must be:
- SPECIFIC (no "improve efficiency", say "cut sales cycle from 90 to 45 days")
- BUYER-AWARE (frame the pain in the buyer's exact words)
- COMMERCIALLY HONEST (acknowledge what won't work, not just what will)
- ACTIONABLE THIS WEEK (no 6-month strategies)

ZERO TOLERANCE FOR:
✗ "Leverage", "unlock", "synergize", "transform", "revolutionize", "game-changer"
✗ "AI-powered", "next-generation", "world-class", "best-in-class"
✗ Generic personas ("decision makers", "growth teams")
✗ Vague pains ("inefficiency", "lack of visibility")
✗ Round-number prices without logic ($999, $4,999) unless you justify why

═══════════════════════════════════════════════
PROOF & HONESTY — CRITICAL
═══════════════════════════════════════════════

NEVER FABRICATE:
✗ Do NOT invent case studies, client numbers, or statistics ("Built 23 systems", "client went from X to Y")
✗ Do NOT claim results the operator hasn't shared with you
✗ Do NOT make guarantees ("guaranteed 2-minute response") unless the operator explicitly states them

INSTEAD:
✓ If the operator provided proof points, USE THEM exactly as given
✓ If NO proof exists, write "[PROOF NEEDED: describe what proof to gather]" in the proof_angle field
✓ Frame positioning around the METHOD and APPROACH, not invented results
✓ For pricing justification, use market logic and value framing, not fake ROI claims
✓ In the outreach pitch, lead with the PROBLEM not unverifiable claims

A strategy with honest "proof needed" placeholders is 10x more valuable than one with fake credentials a prospect will see through in 30 seconds.

═══════════════════════════════════════════════
CONFIDENCE SCORING
═══════════════════════════════════════════════

Set your own confidence score honestly:
- 0.9+ = Operator gave rich context (proof points, specific buyer, clear problem, pricing idea) AND you produced specific, differentiated output
- 0.7-0.89 = Good context but some fields were thin, or output relies on assumptions
- 0.5-0.69 = Multiple fields marked "Not specified" — strategy is directional, needs operator input to sharpen
- Below 0.5 = Very little context provided — output is a starting framework only

═══════════════════════════════════════════════
DECISION FRAMEWORK
═══════════════════════════════════════════════

For every recommendation, ask:
1. What buyer pain — in their exact Monday-morning words — does this address?
2. What competitive alternative are they choosing today, and why is this measurably better?
3. What's the smallest price point that would get them to TRY this in 7 days?
4. What proof would make a skeptical CFO sign off on this? (Use ONLY real proof from the input)
5. What's the ONE next action a buyer takes after hearing this in 30 seconds?

Respond with ONLY valid JSON matching the exact schema below. No markdown, no code fences, no explanation outside the JSON.`

const OUTPUT_SCHEMA = `{
  "agent_name": "Product Strategy Agent",
  "status": "needs_review",
  "summary": "<1-2 sentence summary of the recommended strategy>",
  "one_line_offer": "<single compelling sentence describing the offer>",
  "simple_explanation": "<2-3 sentences explaining what it does in plain language>",
  "target_customer": {
    "primary_icp": "<primary ideal customer profile>",
    "secondary_icp": "<secondary ICP>",
    "buyer_titles": ["<title1>", "<title2>"],
    "best_industries": ["<industry1>", "<industry2>"],
    "company_size": "<company size range>"
  },
  "buyer_pains": [
    {
      "pain": "<specific pain point>",
      "why_it_matters": "<why this pain matters to the buyer>",
      "business_impact": "<quantifiable business impact>"
    }
  ],
  "positioning": {
    "category": "<market category — the frame of reference the buyer should compare against>",
    "competitive_alternatives": ["<what the buyer chooses today instead of us — list 2-3 actual options including 'do nothing'>"],
    "unique_attributes": ["<what we have that competitive alternatives don't — list 2-3>"],
    "value_for_buyer": "<the specific outcome those attributes enable>",
    "differentiation": "<one-sentence positioning statement>",
    "why_now": "<a real market shift that creates urgency THIS quarter, not generic 'AI is changing things'>",
    "proof_angle": "<credibility angle grounded in the operator's actual proof points>"
  },
  "jtbd": {
    "struggling_moment": "<the specific Monday-morning trigger that makes the buyer search for help>",
    "job_to_be_done": "<the progress they're trying to make, phrased as 'When ___ I want to ___ so I can ___'>",
    "hire_criteria": ["<specific outcome they need this to deliver>"],
    "fire_criteria": ["<thing that would make them reject the offer>"]
  },
  "pricing": {
    "pilot_price": "<pilot/test price>",
    "standard_price": "<standard price>",
    "upsell": "<upsell opportunity>",
    "pricing_logic": "<reasoning behind pricing>"
  },
  "offer_packages": [
    {
      "name": "<package name>",
      "price": "<price>",
      "deliverables": ["<deliverable1>", "<deliverable2>"],
      "best_for": "<who this package is for>"
    }
  ],
  "landing_page_angle": {
    "headline": "<hero headline>",
    "subheadline": "<supporting subheadline>",
    "primary_cta": "<primary call to action>",
    "secondary_cta": "<secondary call to action>"
  },
  "outreach_angle": {
    "short_pitch": "<2-3 sentence cold pitch>",
    "opening_line_strategy": "<approach for opening lines>",
    "best_channel": "<recommended outreach channel>"
  },
  "objections": [
    {
      "objection": "<likely objection>",
      "response": "<suggested response>"
    }
  ],
  "recommended_next_actions": [
    "<action 1>",
    "<action 2>",
    "<action 3>"
  ],
  "risks": [
    {
      "risk": "<potential risk>",
      "mitigation": "<how to mitigate>"
    }
  ],
  "human_approval_needed": true,
  "confidence": 0.0
}`

function tryParseJSON(text: string): Record<string, unknown> | null {
  // Try direct parse
  try {
    return JSON.parse(text)
  } catch {
    // noop
  }

  // Try extracting JSON from markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      // noop
    }
  }

  // Try finding first { to last }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      // noop
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local' }, { status: 500 })
  }

  const body = await request.json()
  const projectId = body.project_id
  if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 })

  // Fetch project
  const { data: project, error: projError } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (projError || !project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  // Fetch user profile if available
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  // Fetch Product Strategy Agent ID
  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, name')
    .eq('name', 'Product Strategy Agent')
    .single()

  if (!agent) {
    return Response.json({ error: 'Product Strategy Agent not found in database. Run the schema SQL first.' }, { status: 500 })
  }

  // Log run started
  await logActivity({
    user_id: userId,
    project_id: projectId,
    agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: `Product Strategy Agent started for "${project.name}"`,
  })

  // Build user message with project context (token-efficient)
  const userMessage = `Analyze this product/service idea and generate a complete B2B product strategy.

PROJECT:
- Name: ${project.name}
- Description: ${project.description || 'Not provided'}
- Target buyer: ${project.target_buyer || 'Not specified'}
- Industry: ${project.industry || 'Not specified'}
- Region: ${project.country_or_region || 'Not specified'}
- Problem solved: ${project.problem_solved || 'Not specified'}
- Value proposition: ${project.value_proposition || 'Not specified'}
- Price idea: ${project.price_idea || 'Not specified'}
- Proof/background: ${project.proof_or_background || 'Not provided'}

${profile ? `OPERATOR PROFILE:
- Name: ${profile.full_name || 'Not set'}
- Business: ${profile.business_name || 'Not set'}
- Description: ${profile.business_description || 'Not set'}
- Tone: ${profile.default_tone || 'professional'}
- Industries: ${Array.isArray(profile.target_industries) ? (profile.target_industries as string[]).join(', ') : 'Not set'}
- Proof points: ${Array.isArray(profile.proof_points) ? (profile.proof_points as string[]).join('; ') : 'Not set'}` : ''}

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
      // Save failure
      await logActivity({
        user_id: userId,
        project_id: projectId,
        agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'Product Strategy Agent returned invalid JSON',
        metadata: { raw_response: textBlock.text.slice(0, 500) },
      })
      return Response.json({
        error: 'AI returned invalid JSON. Please try again.',
        raw_preview: textBlock.text.slice(0, 300),
      }, { status: 422 })
    }

    // Save to agent_messages
    const { data: savedMessage, error: saveError } = await supabaseAdmin
      .from('agent_messages')
      .insert({
        user_id: userId,
        project_id: projectId,
        agent_id: agent.id,
        title: `Product Strategy: ${project.name}`,
        summary: (parsed.summary as string) || 'Strategy generated',
        message_type: 'strategy',
        priority: 'high',
        approval_level: 'needs_approval',
        status: 'needs_review',
        input_payload: {
          project_name: project.name,
          project_description: project.description,
          target_buyer: project.target_buyer,
          industry: project.industry,
          price_idea: project.price_idea,
        },
        output_payload: parsed,
        recommended_action: 'Review strategy and approve to update project offer',
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
      event_description: `Product Strategy Agent completed for "${project.name}"`,
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
      event_description: `Product Strategy Agent failed: ${errorMessage}`,
      metadata: { error: errorMessage },
    })

    return Response.json({ error: `AI API call failed: ${errorMessage}` }, { status: 500 })
  }
}
