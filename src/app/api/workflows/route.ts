import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('workflows')
    .select('*, project:projects(id, name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id' }, { status: 401 })

  const body = await request.json()
  const { name, description, project_id, steps } = body

  if (!name || !steps || !Array.isArray(steps)) {
    return Response.json({ error: 'name and steps[] are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('workflows')
    .insert({
      user_id: userId,
      project_id: project_id || null,
      name,
      description: description || null,
      steps,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
