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

  const allowedFields = ['title', 'body', 'cta', 'status', 'visual_direction']
  const update: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (body[key] !== undefined) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('content_assets')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data) return Response.json({ error: 'Content asset not found' }, { status: 404 })

  const eventType = body.status ? 'content.status_updated' : 'content.edited'
  await logActivity({
    user_id: userId,
    project_id: data.project_id,
    event_type: eventType,
    event_description: body.status
      ? `Content status changed to "${body.status}": ${data.title}`
      : `Content edited: ${data.title}`,
    metadata: { content_id: id, updated_fields: Object.keys(update) },
  })

  return Response.json(data)
}
