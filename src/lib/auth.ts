import { supabaseAdmin } from '@/lib/supabase/server'

export async function getUserFromRequest(request: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) return null
  return { id: user.id, email: user.email ?? '' }
}

export function unauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export function errorResponse(message: string, status = 500) {
  return Response.json({ error: message }, { status })
}
