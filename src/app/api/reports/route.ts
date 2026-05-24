import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const [
    { count: projectCount },
    { count: leadCount },
    { count: messageCount },
    { count: pendingCount },
    { count: contentCount },
    { count: outreachCount },
    { count: proposalCount },
    { data: recentActivity },
    { data: leadsByStatus },
    { data: proposalsByStatus },
  ] = await Promise.all([
    supabaseAdmin.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', userId).neq('status', 'archived'),
    supabaseAdmin.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('agent_messages').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('agent_messages').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'needs_review'),
    supabaseAdmin.from('content_assets').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('outreach_messages').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('proposals').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('activity_logs').select('event_type, event_description, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('leads').select('status').eq('user_id', userId),
    supabaseAdmin.from('proposals').select('status').eq('user_id', userId),
  ])

  const leadStatusCounts: Record<string, number> = {}
  leadsByStatus?.forEach((l: { status: string }) => {
    leadStatusCounts[l.status] = (leadStatusCounts[l.status] || 0) + 1
  })

  const proposalStatusCounts: Record<string, number> = {}
  proposalsByStatus?.forEach((p: { status: string }) => {
    proposalStatusCounts[p.status] = (proposalStatusCounts[p.status] || 0) + 1
  })

  return Response.json({
    stats: {
      projects: projectCount || 0,
      leads: leadCount || 0,
      messages: messageCount || 0,
      pending: pendingCount || 0,
      content: contentCount || 0,
      outreach: outreachCount || 0,
      proposals: proposalCount || 0,
    },
    leadsByStatus: leadStatusCounts,
    proposalsByStatus: proposalStatusCounts,
    recentActivity: recentActivity || [],
  })
}
