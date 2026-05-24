import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const projectId = url.searchParams.get('project_id')

  let query = supabaseAdmin
    .from('agent_messages')
    .select('*, agent:agents(id, name, role), project:projects(id, name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
