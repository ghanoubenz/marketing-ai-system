import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { buildProjectContext, formatApprovedStrategy } from '@/lib/services/project-context'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { logActivity } from '@/lib/services/activity-log'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are a senior B2B proposal writer who creates compelling, concise proposals that close deals.

Your proposals:
- Lead with the client's pain, not your features
- Include clear scope, deliverables, timeline, and pricing
- Use proof points and social proof ONLY if provided in the input — never fabricate client names, results, or testimonials
- Have a strong, low-friction CTA
- Are structured for quick scanning by busy executives
- Include 2-3 pricing tiers when appropriate

Respond with ONLY valid JSON matching the exact schema provided.`

const OUTPUT_SCHEMA = `{
  "agent_name": "Proposal Agent",
  "status": "needs_review",
  "summary": "<1-2 sentence summary>",
  "proposal": {
    "title": "<proposal title>",
    "executive_summary": "<2-3 sentence hook focusing on the client's problem>",
    "problem_statement": "<what the client is struggling with>",
    "proposed_solution": "<how we solve it>",
    "scope_of_work": [
      { "phase": "<phase name>", "deliverables": ["<deliverable 1>"], "timeline": "<duration>" }
    ],
    "pricing_tiers": [
      { "name": "<tier name>", "price": "<price>", "includes": ["<item 1>"], "best_for": "<who this tier is for>" }
    ],
    "timeline_overview": "<total project timeline>",
    "proof_points": ["<relevant case study or credential>"],
    "next_steps": "<clear CTA — what the client does next>",
    "terms": "<basic terms or validity period>"
  },
  "recommended_next_action": "<what to do with this proposal>",
  "requires_human": true,
  "confidence": 0.0
}`

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const projectId = body.project_id
  const leadId = body.lead_id
  if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 })

  const ctx = await buildProjectContext(projectId, userId)
  if (!ctx) return Response.json({ error: 'Project not found' }, { status: 404 })

  if (!ctx.project.approved_offer) {
    return Response.json({ error: 'Run and approve Product Strategy Agent first.' }, { status: 400 })
  }

  const agent = await lookupAgent('Proposal Agent')
  if (!agent) return Response.json({ error: 'Proposal Agent not found in database.' }, { status: 500 })

  let leadContext = 'No specific lead — create a generic proposal template.'
  if (leadId) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', userId)
      .single()

    if (lead) {
      leadContext = `LEAD CONTEXT:
- Company: ${lead.company_name}
- Contact: ${lead.contact_name || 'Unknown'}
- Title: ${lead.job_title || 'Unknown'}
- Industry: ${lead.industry || 'Unknown'}
- Pain: ${lead.pain_hypothesis || 'Not specified'}
- Notes: ${lead.personalization_note || lead.notes || 'None'}

Personalize the proposal for this specific client.`
    }
  }

  await logActivity({
    user_id: userId, project_id: projectId, agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: `Proposal Agent started for "${ctx.project.name}"`,
  })

  const userPrompt = `Create a professional B2B proposal for this offer.

${formatApprovedStrategy(ctx.project)}

${leadContext}

Requirements:
1. Write a compelling executive summary that leads with the client's pain
2. Define clear scope with phases and deliverables
3. Create 2-3 pricing tiers (starter, standard, premium)
4. Include timeline, proof points, and a clear next step
5. Keep it scannable — executives spend 2 minutes reading proposals

Respond with ONLY the JSON matching this schema:
${OUTPUT_SCHEMA}`

  try {
    const result = await runAI({
      taskType: 'proposal',
      preferredProvider: 'anthropic',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 4096,
    })

    const parsed = tryParseJSON(result.text)
    if (!parsed) {
      await logActivity({
        user_id: userId, project_id: projectId, agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'Proposal Agent returned invalid JSON',
      })
      return Response.json({ error: 'AI returned invalid JSON.' }, { status: 422 })
    }

    const saved = await createAgentMessage({
      userId, projectId, agentId: agent.id, agentName: 'Proposal Agent',
      title: `Proposal: ${ctx.project.name}`,
      summary: (parsed.summary as string) || 'Proposal generated',
      messageType: 'proposal',
      outputPayload: parsed,
      inputPayload: { project_id: projectId, lead_id: leadId || null },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    })

    return Response.json(saved, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logActivity({
      user_id: userId, project_id: projectId, agent_id: agent.id,
      event_type: 'agent.output_failed',
      event_description: `Proposal Agent failed: ${msg}`,
    })
    return Response.json({ error: `AI API call failed: ${msg}` }, { status: 500 })
  }
}
