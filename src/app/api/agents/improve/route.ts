import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { logActivity } from '@/lib/services/activity-log'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const messageId = body.message_id
  const reviewMessageId = body.review_message_id
  if (!messageId) return Response.json({ error: 'message_id is required' }, { status: 400 })

  // Fetch the original message to improve
  const { data: original, error: origErr } = await supabaseAdmin
    .from('agent_messages')
    .select('*, agent:agents(id, name), project:projects(id, name)')
    .eq('id', messageId)
    .eq('user_id', userId)
    .single()

  if (origErr || !original) return Response.json({ error: 'Original message not found' }, { status: 404 })

  // Fetch CMO review feedback if provided
  let cmoFeedback = ''
  if (reviewMessageId) {
    const { data: review } = await supabaseAdmin
      .from('agent_messages')
      .select('output_payload')
      .eq('id', reviewMessageId)
      .eq('user_id', userId)
      .single()

    if (review?.output_payload) {
      const reviewData = review.output_payload as Record<string, unknown>
      const reviewContent = reviewData.review as Record<string, unknown> | undefined
      if (reviewContent) {
        const scores = reviewContent.scores as Record<string, number> | undefined
        const weaknesses = (reviewContent.weaknesses as Array<Record<string, string>>) || []
        const edits = (reviewContent.specific_edits as string[]) || []
        const improved = reviewContent.improved_version as string || ''
        const verdict = reviewContent.verdict as string || ''
        const verdictReason = reviewContent.verdict_reason as string || ''
        const willMakeMoney = reviewContent.will_this_make_money as string || ''

        cmoFeedback = `\n\n═══════════════════════════════════════════════
CMO REVIEW — FIX ALL ISSUES BELOW
═══════════════════════════════════════════════\n`

        if (scores) {
          const lowScores = Object.entries(scores).filter(([, v]) => v < 7).sort((a, b) => a[1] - b[1])
          if (lowScores.length) {
            cmoFeedback += `\nLOWEST SCORES (fix these first):\n${lowScores.map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}/10`).join('\n')}`
          }
        }

        if (weaknesses.length) {
          cmoFeedback += `\n\nWEAKNESSES FOUND:\n${weaknesses.map(w => `- PROBLEM: ${w.issue}\n  QUOTED: "${w.quote || ''}"\n  FIX: ${w.fix}`).join('\n\n')}`
        }
        if (edits.length) {
          cmoFeedback += `\n\nREQUIRED EDITS:\n${edits.map(e => `- ${e}`).join('\n')}`
        }
        if (improved) {
          cmoFeedback += `\n\nCMO'S IMPROVED VERSION (use as reference):\n${improved}`
        }
        if (willMakeMoney) {
          cmoFeedback += `\n\nCOMMERCIAL ASSESSMENT: ${willMakeMoney}`
        }

        cmoFeedback += `\n\nVERDICT: ${verdict} — ${verdictReason}`
        cmoFeedback += `\n\nCRITICAL RULES FOR THIS REVISION:
1. Fix EVERY weakness listed above — do not skip any
2. NEVER fabricate statistics, case studies, or client results that weren't in the original input
3. If proof is needed, write "[PROOF NEEDED: suggest what to gather]" — honest gaps beat fake credibility
4. Make differentiation specific to the operator's actual method/approach, not generic claims anyone could make
5. Every CTA must include urgency, scarcity, or risk reversal`
      }
    }
  }

  const agentName = (original.agent as { id: string; name: string } | null)?.name || 'Unknown'
  const agent = await lookupAgent(agentName)
  if (!agent) return Response.json({ error: `Agent "${agentName}" not found` }, { status: 500 })

  await logActivity({
    user_id: userId,
    project_id: original.project_id,
    agent_id: agent.id,
    event_type: 'agent.improve_started',
    event_description: `Improving ${agentName} output based on feedback`,
    metadata: { original_message_id: messageId, review_message_id: reviewMessageId },
  })

  const originalOutput = JSON.stringify(original.output_payload, null, 2)
  const projectName = (original.project as { id: string; name: string } | null)?.name || ''

  const systemPrompt = `You are the ${agentName} — a senior B2B marketing specialist. You produced the output below and your CMO reviewed it. Your CMO found specific problems that MUST be fixed before this goes live.

YOUR TASK: Rewrite the COMPLETE output, fixing every issue the CMO identified while keeping what's already strong.

RULES:
- Output the COMPLETE improved version in the EXACT SAME JSON schema as the original
- Do not output partial updates — output the full improved JSON
- NEVER invent statistics, case studies, or client results — use only facts from the input
- If proof is missing, write "[PROOF NEEDED: describe what to gather]" — this is MORE valuable than fake data
- Make every claim specific and defensible — if a competitor could say the same thing, rewrite it
- Keep the same JSON structure and field names exactly`

  const userPrompt = `${projectName ? `PROJECT: ${projectName}\n\n` : ''}ORIGINAL OUTPUT TO IMPROVE:
${originalOutput.slice(0, 6000)}
${cmoFeedback}

Produce the complete improved version. Same JSON schema, dramatically better content. The CMO will review this again — make sure every weakness is fixed.

Respond with ONLY valid JSON.`

  try {
    const result = await runAI({
      taskType: 'improve',
      preferredProvider: 'anthropic',
      systemPrompt,
      userPrompt,
      maxTokens: 4096,
    })

    const parsed = tryParseJSON(result.text)
    if (!parsed) {
      return Response.json({ error: 'AI returned invalid JSON on improvement.' }, { status: 422 })
    }

    // Mark original as rejected/superseded
    await supabaseAdmin
      .from('agent_messages')
      .update({ status: 'rejected', rejected_at: new Date().toISOString() })
      .eq('id', messageId)

    // Save improved version as new message
    const saved = await createAgentMessage({
      userId,
      projectId: original.project_id || '',
      agentId: agent.id,
      agentName,
      title: `[Improved] ${original.title}`,
      summary: (parsed.summary as string) || `Improved version of: ${original.title}`,
      messageType: original.message_type,
      outputPayload: parsed,
      inputPayload: {
        ...(original.input_payload as Record<string, unknown> || {}),
        improved_from: messageId,
        review_message_id: reviewMessageId || null,
      },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    })

    await logActivity({
      user_id: userId,
      project_id: original.project_id,
      agent_id: agent.id,
      event_type: 'agent.improved',
      event_description: `${agentName} output improved`,
      metadata: { original_id: messageId, new_id: saved.id },
    })

    return Response.json(saved, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logActivity({
      user_id: userId,
      project_id: original.project_id,
      agent_id: agent.id,
      event_type: 'agent.improve_failed',
      event_description: `Improvement failed: ${msg}`,
    })
    return Response.json({ error: `Improvement failed: ${msg}` }, { status: 500 })
  }
}
