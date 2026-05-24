import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from './activity-log'

export interface CreateAgentMessageParams {
  userId: string
  projectId: string
  agentId: string
  agentName: string
  title: string
  summary: string
  messageType: string
  outputPayload: Record<string, unknown>
  inputPayload?: Record<string, unknown>
  confidence?: number
}

export async function createAgentMessage(params: CreateAgentMessageParams) {
  const { data, error } = await supabaseAdmin
    .from('agent_messages')
    .insert({
      user_id: params.userId,
      project_id: params.projectId,
      agent_id: params.agentId,
      title: params.title,
      summary: params.summary,
      message_type: params.messageType,
      priority: 'high',
      approval_level: 'needs_approval',
      status: 'needs_review',
      input_payload: params.inputPayload || { project_id: params.projectId },
      output_payload: params.outputPayload,
      recommended_action: `Review ${params.agentName} output and approve to save`,
      requires_human: true,
      confidence: params.confidence ?? null,
    })
    .select()
    .single()

  if (error) throw new Error('Failed to save agent output: ' + error.message)

  await logActivity({
    user_id: params.userId,
    project_id: params.projectId,
    agent_id: params.agentId,
    event_type: 'agent.output_created',
    event_description: `${params.agentName} completed for project`,
    metadata: { message_id: data.id, confidence: params.confidence },
  })

  return data
}

export async function lookupAgent(name: string) {
  const { data } = await supabaseAdmin
    .from('agents')
    .select('id, name')
    .eq('name', name)
    .single()
  return data
}
