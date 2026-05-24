import { NextRequest } from 'next/server'
import { triggerAgent, shouldAutoTriggerCMO } from '@/lib/services/agent-pipeline'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const { message_id, target_agent } = body

  if (!message_id || !target_agent) {
    return Response.json({ error: 'message_id and target_agent are required' }, { status: 400 })
  }

  const { data: source } = await supabaseAdmin
    .from('agent_messages')
    .select('*, agent:agents(id, name)')
    .eq('id', message_id)
    .eq('user_id', userId)
    .single()

  if (!source) return Response.json({ error: 'Source message not found' }, { status: 404 })

  const sourceAgentName = (source.agent as { id: string; name: string } | null)?.name || 'Unknown'
  const projectId = source.project_id

  if (!projectId) return Response.json({ error: 'Source message has no project' }, { status: 400 })

  // If sending to CMO, pass the message_id directly
  if (target_agent === 'cmo-review') {
    const result = await triggerAgent('cmo-review', projectId, userId, {
      agentSlug: sourceAgentName.toLowerCase().replace(/\s+/g, '-'),
      messageId: message_id,
    })

    await logActivity({
      user_id: userId,
      project_id: projectId,
      event_type: 'pipeline.manual_send',
      event_description: `Manually sent ${sourceAgentName} output to CMO Review`,
      metadata: { source_message: message_id, target: 'cmo-review' },
    })

    return Response.json({
      sent: true,
      from: sourceAgentName,
      to: 'CMO Review Agent',
      result,
    })
  }

  // If sending to improve, pass the message + find latest CMO review
  if (target_agent === 'improve') {
    const { data: reviews } = await supabaseAdmin
      .from('agent_messages')
      .select('id, input_payload')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('message_type', 'report')
      .order('created_at', { ascending: false })
      .limit(10)

    const reviewMsg = reviews?.find((r: Record<string, unknown>) => {
      const inp = r.input_payload as Record<string, unknown> | null
      return inp?.reviewed_message_id === message_id
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/agents/improve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({
        message_id,
        review_message_id: reviewMsg?.id || null,
      }),
    })

    const result = await res.json()
    return Response.json({
      sent: true,
      from: sourceAgentName,
      to: 'Improve Agent',
      had_cmo_review: !!reviewMsg,
      result,
    })
  }

  // For any other agent, trigger it with the project context
  const result = await triggerAgent(target_agent, projectId, userId, {
    agentSlug: sourceAgentName.toLowerCase().replace(/\s+/g, '-'),
    messageId: message_id,
  })

  // Auto-trigger CMO if configured for the target
  let cmoTriggered = false
  if (result.success && result.messageId && shouldAutoTriggerCMO(target_agent)) {
    await triggerAgent('cmo-review', projectId, userId, {
      agentSlug: target_agent,
      messageId: result.messageId,
    })
    cmoTriggered = true
  }

  await logActivity({
    user_id: userId,
    project_id: projectId,
    event_type: 'pipeline.manual_send',
    event_description: `Manually sent ${sourceAgentName} output to ${target_agent}`,
    metadata: { source_message: message_id, target: target_agent, cmo_auto: cmoTriggered },
  })

  return Response.json({
    sent: true,
    from: sourceAgentName,
    to: target_agent,
    cmo_auto_triggered: cmoTriggered,
    result,
  })
}
