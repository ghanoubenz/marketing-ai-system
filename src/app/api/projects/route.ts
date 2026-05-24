import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({
      user_id: userId,
      name: body.name,
      description: body.description || null,
      product_type: body.product_type || null,
      target_buyer: body.target_buyer || null,
      industry: body.industry || null,
      country_or_region: body.country_or_region || null,
      problem_solved: body.problem_solved || null,
      value_proposition: body.value_proposition || null,
      price_idea: body.price_idea || null,
      proof_or_background: body.proof_or_background || null,
      status: body.status || 'idea',
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logActivity({
    user_id: userId,
    project_id: data.id,
    event_type: 'project.created',
    event_description: `Created project "${data.name}"`,
    metadata: { project_name: data.name, status: data.status },
  })

  return Response.json(data, { status: 201 })
}
