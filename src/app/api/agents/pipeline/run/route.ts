import { NextRequest } from 'next/server'
import { runPipeline, PIPELINE_CONFIG } from '@/lib/services/agent-pipeline'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const projectId = body.project_id
  const startAgent = body.start_agent || 'product-strategy'
  const skipCMO = body.skip_cmo === true

  if (!projectId) {
    return Response.json({ error: 'project_id is required' }, { status: 400 })
  }

  const validSlugs = PIPELINE_CONFIG.map(s => s.agentSlug)
  if (!validSlugs.includes(startAgent) && startAgent !== 'product-strategy') {
    return Response.json({ error: `Invalid start_agent: ${startAgent}` }, { status: 400 })
  }

  await logActivity({
    user_id: userId,
    project_id: projectId,
    event_type: 'pipeline.started',
    event_description: `Pipeline started from ${startAgent}`,
    metadata: { start_agent: startAgent, skip_cmo: skipCMO },
  })

  const { results } = await runPipeline(startAgent, projectId, userId, { skipCMO })

  const succeeded = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return Response.json({
    pipeline: 'started',
    start_agent: startAgent,
    results,
    summary: { succeeded, failed, total: results.length },
  })
}
