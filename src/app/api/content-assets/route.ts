import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')
  const contentType = searchParams.get('content_type')

  let query = supabaseAdmin
    .from('content_assets')
    .select('*, project:projects(id, name), agent:agents(id, name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (projectId) query = query.eq('project_id', projectId)
  if (contentType) query = query.eq('content_type', contentType)

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
