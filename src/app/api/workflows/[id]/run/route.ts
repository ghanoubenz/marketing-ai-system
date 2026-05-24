import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { triggerAgent, shouldAutoTriggerCMO } from '@/lib/services/agent-pipeline'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface WorkflowStep {
  agent: string
  label: string
  auto_cmo?: boolean
  auto_improve?: boolean
  auto_research?: string
  wait_for_approval?: boolean
  depends_on?: number[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id' }, { status: 401 })

  const { id } = await params

  const { data: workflow, error } = await supabaseAdmin
    .from('workflows')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !workflow) return Response.json({ error: 'Workflow not found' }, { status: 404 })

  const steps = workflow.steps as WorkflowStep[]
  const projectId = workflow.project_id
  if (!projectId) return Response.json({ error: 'Workflow has no project assigned' }, { status: 400 })

  await supabaseAdmin
    .from('workflows')
    .update({ status: 'running', started_at: new Date().toISOString(), current_step: 0, results: [] })
    .eq('id', id)

  await logActivity({
    user_id: userId,
    project_id: projectId,
    event_type: 'workflow.started',
    event_description: `Workflow "${workflow.name}" started with ${steps.length} steps`,
    metadata: { workflow_id: id },
  })

  const results: Array<{
    step: number
    agent: string
    status: 'success' | 'failed' | 'skipped'
    message_id?: string
    error?: string
    sub_steps?: Array<{ agent: string; status: string; message_id?: string }>
  }> = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    await supabaseAdmin
      .from('workflows')
      .update({ current_step: i, results })
      .eq('id', id)

    // Check dependencies
    if (step.depends_on && step.depends_on.length > 0) {
      const allDepsOk = step.depends_on.every(dep => results[dep]?.status === 'success')
      if (!allDepsOk) {
        results.push({ step: i, agent: step.agent, status: 'skipped', error: 'Dependencies not met' })
        continue
      }
    }

    // Run the agent
    const agentResult = await triggerAgent(step.agent, projectId, userId)
    const subSteps: Array<{ agent: string; status: string; message_id?: string }> = []

    if (!agentResult.success) {
      results.push({ step: i, agent: step.agent, status: 'failed', error: agentResult.error })
      continue
    }

    subSteps.push({ agent: step.agent, status: 'success', message_id: agentResult.messageId })

    // Auto CMO review
    if (step.auto_cmo && agentResult.messageId) {
      const cmoResult = await triggerAgent('cmo-review', projectId, userId, {
        agentSlug: step.agent,
        messageId: agentResult.messageId,
      })
      subSteps.push({ agent: 'cmo-review', status: cmoResult.success ? 'success' : 'failed', message_id: cmoResult.messageId })

      // Auto improve if CMO ran
      if (step.auto_improve && cmoResult.success && cmoResult.messageId && agentResult.messageId) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        try {
          const improveRes = await fetch(`${baseUrl}/api/agents/improve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({
              message_id: agentResult.messageId,
              review_message_id: cmoResult.messageId,
            }),
          })
          const improveData = await improveRes.json()
          subSteps.push({ agent: 'improve', status: improveRes.ok ? 'success' : 'failed', message_id: improveData.id })
        } catch {
          subSteps.push({ agent: 'improve', status: 'failed' })
        }
      }
    }

    // Auto research
    if (step.auto_research && agentResult.messageId) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      try {
        const researchRes = await fetch(`${baseUrl}/api/agents/research/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
          body: JSON.stringify({
            project_id: projectId,
            query: step.auto_research,
            triggered_by: step.agent,
          }),
        })
        const researchData = await researchRes.json()
        subSteps.push({ agent: 'research', status: researchRes.ok ? 'success' : 'failed', message_id: researchData.id })
      } catch {
        subSteps.push({ agent: 'research', status: 'failed' })
      }
    }

    results.push({
      step: i,
      agent: step.agent,
      status: 'success',
      message_id: agentResult.messageId,
      sub_steps: subSteps.length > 1 ? subSteps : undefined,
    })
  }

  const allSuccess = results.every(r => r.status === 'success' || r.status === 'skipped')

  await supabaseAdmin
    .from('workflows')
    .update({
      status: allSuccess ? 'completed' : 'failed',
      current_step: steps.length,
      results,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)

  await logActivity({
    user_id: userId,
    project_id: projectId,
    event_type: 'workflow.completed',
    event_description: `Workflow "${workflow.name}" ${allSuccess ? 'completed' : 'finished with errors'}`,
    metadata: { workflow_id: id, results_summary: results.map(r => `${r.agent}: ${r.status}`).join(', ') },
  })

  return Response.json({
    workflow_id: id,
    status: allSuccess ? 'completed' : 'failed',
    results,
  })
}
