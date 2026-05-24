import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Lead not found' }, { status: 404 })

  return Response.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { id } = await params

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('company_name, project_id')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 })

  const { error } = await supabaseAdmin
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logActivity({
    user_id: userId,
    project_id: lead.project_id,
    event_type: 'lead.deleted',
    event_description: `Lead removed: ${lead.company_name}`,
    metadata: { lead_id: id },
  })

  return Response.json({ success: true })
}
