import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { logActivity } from '@/lib/services/activity-log'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are a B2B revenue operations advisor who helps solo operators hit weekly revenue targets.

You think like a VP of Revenue at a startup: you track the PIPELINE MATH, identify BOTTLENECKS, and prescribe the EXACT actions needed this week to close deals.

═══════════════════════════════════════════════
YOUR FRAMEWORK: PIPELINE MATH
═══════════════════════════════════════════════

Revenue = Leads × Contact Rate × Reply Rate × Meeting Rate × Close Rate × Avg Deal Size

For a solo operator targeting $500/week ($2K/month):
- Need 20-30 new leads contacted per week
- Need 3-5 replies per week (15-20% reply rate)
- Need 1-2 meetings per week (40% of replies)
- Need 1 close per week (50% close rate on meetings)
- Average deal size: $500-$2,000

═══════════════════════════════════════════════
WHAT YOU DO
═══════════════════════════════════════════════

1. Calculate current pipeline health from real data
2. Identify the #1 bottleneck (where the funnel breaks)
3. Prescribe 3-5 specific actions for THIS WEEK
4. Estimate revenue probability for this week
5. Flag risks and missed opportunities

═══════════════════════════════════════════════
RULES
═══════════════════════════════════════════════

- NEVER invent data. Use only what's provided.
- If pipeline is empty, the action is ALWAYS "add leads and start outreach"
- Be specific: "Contact 5 leads from [project X]" not "do more outreach"
- Prioritize by revenue proximity: proposal_sent > meeting_booked > interested > new
- Track velocity: how fast leads move through stages

Respond with ONLY valid JSON matching the schema provided.`

const OUTPUT_SCHEMA = `{
  "agent_name": "Weekly Ops Agent",
  "status": "needs_review",
  "summary": "<1-sentence revenue status>",
  "weekly_report": {
    "target": "$500/week",
    "estimated_this_week": "<$ estimate based on pipeline>",
    "confidence_level": "<high|medium|low>",
    "pipeline_snapshot": {
      "total_leads": 0,
      "new_leads_this_week": 0,
      "contacted": 0,
      "replied": 0,
      "meetings_booked": 0,
      "proposals_sent": 0,
      "won_this_month": 0,
      "lost_this_month": 0
    },
    "bottleneck": {
      "stage": "<the stage where the funnel breaks>",
      "problem": "<what's wrong>",
      "fix": "<specific action to unblock>"
    },
    "monday_actions": [
      { "priority": 1, "action": "<specific action>", "why": "<revenue impact>", "time_estimate": "<minutes>" }
    ],
    "content_to_create": ["<1-2 content pieces that support the pipeline>"],
    "leads_to_contact": "<specific guidance on who to contact>",
    "follow_ups_due": "<any overdue follow-ups>",
    "risks": ["<things that could derail this week>"],
    "wins": ["<positive signals from data>"]
  },
  "recommended_next_action": "<the single most important thing to do RIGHT NOW>",
  "requires_human": true,
  "confidence": 0.0
}`

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const projectId = body.project_id // optional — can run across all projects

  const agent = await lookupAgent('Weekly CEO Report Agent')
  if (!agent) return Response.json({ error: 'Weekly CEO Report Agent not found.' }, { status: 500 })

  await logActivity({
    user_id: userId, project_id: projectId || null, agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: 'Weekly Ops Agent started',
  })

  // Gather real pipeline data
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    { data: allLeads },
    { data: recentLeads },
    { data: allProjects },
    { data: outreachMessages },
    { data: proposals },
    { data: recentActivity },
    { count: contentCount },
  ] = await Promise.all([
    supabaseAdmin.from('leads').select('id, company_name, status, priority_score, next_follow_up_date, project_id, created_at').eq('user_id', userId),
    supabaseAdmin.from('leads').select('id, company_name, status').eq('user_id', userId).gte('created_at', weekAgo.toISOString()),
    supabaseAdmin.from('projects').select('id, name, status, approved_offer').eq('user_id', userId).neq('status', 'archived'),
    supabaseAdmin.from('outreach_messages').select('id, status, channel, created_at').eq('user_id', userId),
    supabaseAdmin.from('proposals').select('id, title, status, created_at, lead_id').eq('user_id', userId),
    supabaseAdmin.from('activity_logs').select('event_type, event_description, created_at').eq('user_id', userId).gte('created_at', weekAgo.toISOString()).order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('content_assets').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const leads = allLeads || []
  const leadsByStatus: Record<string, number> = {}
  leads.forEach(l => { leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1 })

  const overdueFollowUps = leads.filter(l =>
    l.next_follow_up_date && new Date(l.next_follow_up_date) < now
  )

  const proposalsByStatus: Record<string, number> = {}
  ;(proposals || []).forEach(p => { proposalsByStatus[p.status] = (proposalsByStatus[p.status] || 0) + 1 })

  const wonThisMonth = (proposals || []).filter(p => p.status === 'won' && new Date(p.created_at) >= monthStart).length
  const lostThisMonth = (proposals || []).filter(p => p.status === 'lost' && new Date(p.created_at) >= monthStart).length

  const pipelineData = `PIPELINE DATA (real, from database):

PROJECTS: ${(allProjects || []).length} total
${(allProjects || []).map(p => `- ${p.name} (${p.status}) ${p.approved_offer ? '✓ offer approved' : '✗ no offer yet'}`).join('\n')}

LEADS: ${leads.length} total
- By status: ${JSON.stringify(leadsByStatus)}
- New this week: ${(recentLeads || []).length}
- Overdue follow-ups: ${overdueFollowUps.length}${overdueFollowUps.length > 0 ? ' — ' + overdueFollowUps.slice(0, 5).map(l => l.company_name).join(', ') : ''}
- High-priority leads (score ≥ 70): ${leads.filter(l => l.priority_score >= 70).length}

OUTREACH: ${(outreachMessages || []).length} total messages
- Approved: ${(outreachMessages || []).filter(m => m.status === 'approved').length}
- Sent (manually marked): ${(outreachMessages || []).filter(m => m.status === 'manually_sent').length}

PROPOSALS: ${(proposals || []).length} total
- By status: ${JSON.stringify(proposalsByStatus)}
- Won this month: ${wonThisMonth}
- Lost this month: ${lostThisMonth}

CONTENT: ${contentCount || 0} approved assets

RECENT ACTIVITY (last 7 days): ${(recentActivity || []).length} events
${(recentActivity || []).slice(0, 10).map(a => `- ${a.event_type}: ${a.event_description}`).join('\n')}

TODAY: ${now.toISOString().split('T')[0]} (${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()]})`

  const userPrompt = `Analyze my pipeline and tell me exactly what to do this week to hit $500 revenue.

${pipelineData}

Be specific. Name the leads I should contact. Name the projects I should focus on. Tell me the #1 bottleneck and how to fix it today.

Respond with ONLY the JSON matching this schema:
${OUTPUT_SCHEMA}`

  try {
    const result = await runAI({
      taskType: 'weekly-ops',
      preferredProvider: 'anthropic',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 3000,
    })

    const parsed = tryParseJSON(result.text)
    if (!parsed) {
      await logActivity({
        user_id: userId, project_id: projectId || null, agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'Weekly Ops Agent returned invalid JSON',
      })
      return Response.json({ error: 'AI returned invalid JSON.' }, { status: 422 })
    }

    const saved = await createAgentMessage({
      userId,
      projectId: projectId || (allProjects?.[0]?.id) || '',
      agentId: agent.id,
      agentName: 'Weekly Ops Agent',
      title: `Weekly Ops: ${now.toISOString().split('T')[0]}`,
      summary: (parsed.summary as string) || 'Weekly ops report generated',
      messageType: 'report',
      outputPayload: parsed,
      inputPayload: { date: now.toISOString().split('T')[0], pipeline_snapshot: leadsByStatus },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    })

    return Response.json(saved, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logActivity({
      user_id: userId, project_id: projectId || null, agent_id: agent.id,
      event_type: 'agent.output_failed',
      event_description: `Weekly Ops Agent failed: ${msg}`,
    })
    return Response.json({ error: `AI API call failed: ${msg}` }, { status: 500 })
  }
}
