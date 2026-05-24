import { supabaseAdmin } from '@/lib/supabase/server'

interface LogActivityParams {
  user_id: string
  project_id?: string | null
  agent_id?: string | null
  lead_id?: string | null
  event_type: string
  event_description: string
  metadata?: Record<string, unknown>
}

export async function logActivity(params: LogActivityParams) {
  const { error } = await supabaseAdmin
    .from('activity_logs')
    .insert({
      user_id: params.user_id,
      project_id: params.project_id ?? null,
      agent_id: params.agent_id ?? null,
      lead_id: params.lead_id ?? null,
      event_type: params.event_type,
      event_description: params.event_description,
      metadata: params.metadata ?? {},
    })

  if (error) {
    console.error('Failed to log activity:', error.message)
  }
}
