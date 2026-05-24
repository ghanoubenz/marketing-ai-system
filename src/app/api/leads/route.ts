import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('leads')
    .select('*, project:projects(id, name)')
    .eq('user_id', userId)
    .order('priority_score', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  if (!body.company_name?.trim()) return Response.json({ error: 'company_name is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({ user_id: userId, ...body })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logActivity({
    user_id: userId,
    project_id: body.project_id || null,
    event_type: 'lead.created',
    event_description: `Lead added: ${body.company_name}`,
    metadata: { lead_id: data.id },
  })

  return Response.json(data, { status: 201 })
}
