import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { logActivity } from '@/lib/services/activity-log'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are a senior B2B CMO with 15+ years at companies like HubSpot, Salesforce, Gong, and Drift. You review marketing outputs the way a demanding CMO would review work from their team before it goes live.

Your job: catch weak, generic, or uncommercial work before it wastes the operator's time or damages their brand.

═══════════════════════════════════════════════
SCORING FRAMEWORK (each 1-10)
═══════════════════════════════════════════════

1. CLARITY (1-10): Can a busy executive understand the core message in 5 seconds?
2. BUYER PAIN (1-10): Does this address a real, specific, urgent buyer problem?
3. SPECIFICITY (1-10): Are there concrete numbers, examples, or proof — or just vague claims?
4. COMMERCIAL VALUE (1-10): Will this move a prospect closer to buying?
5. DIFFERENTIATION (1-10): Could a competitor publish this same thing? If yes, score low.
6. CTA STRENGTH (1-10): Is the next action obvious, low-friction, and compelling?
7. PROOF & CREDIBILITY (1-10): Is there evidence, social proof, or authority?
8. NON-GENERIC (1-10): Would a senior marketer be embarrassed to publish this? If yes, score 1-3.

═══════════════════════════════════════════════
VERDICT RULES
═══════════════════════════════════════════════

- Average score ≥ 7.5 → "approve" (minor polish only)
- Average score 5.5-7.4 → "revise" (fixable with specific edits)
- Average score < 5.5 → "reject" (fundamentally weak, regenerate)

═══════════════════════════════════════════════
OUTPUT RULES
═══════════════════════════════════════════════

For EVERY review:
1. Score each dimension
2. Give 2-3 specific weaknesses (quote the weak line)
3. Give an improved version of the weakest part
4. State the verdict with a 1-sentence reason
5. If "revise": provide the exact edits needed (not vague suggestions)

Be BRUTALLY HONEST. Generic praise is useless. The operator needs to know if this will work in a real market with real buyers who have real alternatives.

Respond with ONLY valid JSON matching the schema provided.`

const OUTPUT_SCHEMA = `{
  "agent_name": "CMO Review Agent",
  "status": "needs_review",
  "summary": "<1-sentence verdict>",
  "review": {
    "scores": {
      "clarity": 0,
      "buyer_pain": 0,
      "specificity": 0,
      "commercial_value": 0,
      "differentiation": 0,
      "cta_strength": 0,
      "proof_credibility": 0,
      "non_generic": 0
    },
    "average_score": 0.0,
    "verdict": "<approve|revise|reject>",
    "verdict_reason": "<1-sentence reason>",
    "weaknesses": [
      { "issue": "<specific weakness>", "quote": "<the weak line from the original>", "fix": "<how to fix it>" }
    ],
    "improved_version": "<rewritten version of the weakest section>",
    "strengths": ["<what's already good — keep these>"],
    "specific_edits": ["<exact edit 1>", "<exact edit 2>"],
    "will_this_make_money": "<honest 1-sentence assessment of commercial impact>"
  },
  "recommended_next_action": "<what the operator should do>",
  "requires_human": true,
  "confidence": 0.0
}`

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const messageId = body.message_id
  if (!messageId) return Response.json({ error: 'message_id is required' }, { status: 400 })

  // Fetch the agent message to review
  const { data: message, error: msgError } = await supabaseAdmin
    .from('agent_messages')
    .select('*, agent:agents(id, name), project:projects(id, name)')
    .eq('id', messageId)
    .eq('user_id', userId)
    .single()

  if (msgError || !message) return Response.json({ error: 'Message not found' }, { status: 404 })

  const agent = await lookupAgent('CMO Review Agent')
  if (!agent) return Response.json({ error: 'CMO Review Agent not found in database.' }, { status: 500 })

  await logActivity({
    user_id: userId,
    project_id: message.project_id,
    agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: `CMO Review started for: ${message.title}`,
  })

  const sourceAgent = (message.agent as { name: string } | null)?.name || 'Unknown Agent'
  const outputText = JSON.stringify(message.output_payload, null, 2)

  const userPrompt = `Review this ${sourceAgent} output. Score it honestly and tell me if it's ready to use in the real market.

SOURCE: ${sourceAgent}
TITLE: ${message.title}
TYPE: ${message.message_type}

OUTPUT TO REVIEW:
${outputText.slice(0, 6000)}

Review this as if you're a CMO deciding whether to let this go live to real prospects. Be specific about what's weak and how to fix it.

Respond with ONLY the JSON matching this schema:
${OUTPUT_SCHEMA}`

  try {
    const result = await runAI({
      taskType: 'cmo-review',
      preferredProvider: 'anthropic',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 3000,
    })

    const parsed = tryParseJSON(result.text)
    if (!parsed) {
      await logActivity({
        user_id: userId, project_id: message.project_id, agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'CMO Review Agent returned invalid JSON',
      })
      return Response.json({ error: 'AI returned invalid JSON.' }, { status: 422 })
    }

    const saved = await createAgentMessage({
      userId,
      projectId: message.project_id || '',
      agentId: agent.id,
      agentName: 'CMO Review Agent',
      title: `CMO Review: ${message.title}`,
      summary: (parsed.summary as string) || 'Review completed',
      messageType: 'report',
      outputPayload: parsed,
      inputPayload: { reviewed_message_id: messageId, source_agent: sourceAgent },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    })

    return Response.json(saved, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logActivity({
      user_id: userId, project_id: message.project_id, agent_id: agent.id,
      event_type: 'agent.output_failed',
      event_description: `CMO Review Agent failed: ${msg}`,
    })
    return Response.json({ error: `AI API call failed: ${msg}` }, { status: 500 })
  }
}
