import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { id } = await params

  const { data: message } = await supabaseAdmin
    .from('agent_messages')
    .select('id, title, project_id, agent_id')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!message) return Response.json({ error: 'Message not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('agent_messages')
    .update({ status: 'done' })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logActivity({
    user_id: userId,
    project_id: message.project_id,
    agent_id: message.agent_id,
    event_type: 'agent.message_done',
    event_description: `Marked done: ${message.title}`,
    metadata: { message_id: id },
  })

  return Response.json({ success: true, status: 'done' })
}
