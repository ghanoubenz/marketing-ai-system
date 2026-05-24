import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) return Response.json({ error: error.message }, { status: 404 })
  return Response.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!existing) return Response.json({ error: 'Project not found' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(body)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logActivity({
    user_id: userId,
    project_id: id,
    event_type: 'project.updated',
    event_description: `Updated project "${data.name}"`,
    metadata: { updated_fields: Object.keys(body) },
  })

  return Response.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { id } = await params

  // Soft delete: archive
  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, name')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logActivity({
    user_id: userId,
    project_id: id,
    event_type: 'project.archived',
    event_description: `Archived project "${data.name}"`,
  })

  return Response.json({ success: true })
}
