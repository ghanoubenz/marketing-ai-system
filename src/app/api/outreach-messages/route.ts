import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const channel = searchParams.get('channel')
  const status = searchParams.get('status')

  let query = supabaseAdmin
    .from('outreach_messages')
    .select('*, project:projects(id, name)')
    .eq('user_id', userId)
    .order('sequence_step', { ascending: true })

  if (projectId) query = query.eq('project_id', projectId)
  if (channel) query = query.eq('channel', channel)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
