import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from './activity-log'

// The revenue pipeline: what triggers what
// Each agent declares its downstream targets
export interface PipelineStep {
  agentSlug: string
  agentName: string
  triggerAfter?: string[]       // runs after these agents complete
  requiresApproval?: boolean    // wait for human approval before triggering downstream
  parallel?: boolean            // can run in parallel with siblings
  autoTriggerCMO?: boolean      // auto-send to CMO after this agent finishes
}

// The default revenue pipeline
// Strategy → CMO → [human approves] → Content + Outreach + Landing Page (parallel) → CMO each
export const PIPELINE_CONFIG: PipelineStep[] = [
  {
    agentSlug: 'product-strategy',
    agentName: 'Product Strategy Agent',
    autoTriggerCMO: true,
  },
  {
    agentSlug: 'cmo-review',
    agentName: 'CMO Review Agent',
    triggerAfter: ['product-strategy'],
  },
  {
    agentSlug: 'content',
    agentName: 'Content Agent',
    triggerAfter: ['product-strategy'],
    requiresApproval: true,
    parallel: true,
    autoTriggerCMO: true,
  },
  {
    agentSlug: 'outreach',
    agentName: 'Outreach Agent',
    triggerAfter: ['product-strategy'],
    requiresApproval: true,
    parallel: true,
    autoTriggerCMO: true,
  },
  {
    agentSlug: 'landing-page',
    agentName: 'Landing Page Agent',
    triggerAfter: ['product-strategy'],
    requiresApproval: true,
    parallel: true,
    autoTriggerCMO: true,
  },
  {
    agentSlug: 'lead-research',
    agentName: 'Lead Research Agent',
    triggerAfter: ['product-strategy'],
    requiresApproval: true,
    parallel: true,
  },
  {
    agentSlug: 'carousel-design',
    agentName: 'Carousel / One-Pager Agent',
    triggerAfter: ['content'],
    requiresApproval: true,
    autoTriggerCMO: true,
  },
  {
    agentSlug: 'proposal',
    agentName: 'Proposal Agent',
    triggerAfter: ['landing-page', 'outreach'],
    requiresApproval: true,
    autoTriggerCMO: true,
  },
]

export type PipelineStatus = 'running' | 'waiting_approval' | 'completed' | 'failed'

export interface PipelineRun {
  id: string
  projectId: string
  userId: string
  status: PipelineStatus
  currentStep: string
  completedSteps: string[]
  failedSteps: string[]
  messageMap: Record<string, string> // agentSlug → message_id
  createdAt: string
}

// Get the next agents to run after a given agent completes
export function getDownstreamAgents(completedAgent: string, requiresApproval: boolean): PipelineStep[] {
  return PIPELINE_CONFIG.filter(step => {
    if (!step.triggerAfter?.includes(completedAgent)) return false
    if (step.requiresApproval && !requiresApproval) return false
    return true
  })
}

// Get agents that should auto-trigger (no approval needed)
export function getAutoTriggerAgents(completedAgent: string): PipelineStep[] {
  return PIPELINE_CONFIG.filter(step =>
    step.triggerAfter?.includes(completedAgent) && !step.requiresApproval
  )
}

// Check if an agent should auto-trigger CMO review
export function shouldAutoTriggerCMO(agentSlug: string): boolean {
  const step = PIPELINE_CONFIG.find(s => s.agentSlug === agentSlug)
  return step?.autoTriggerCMO === true
}

// Get the pipeline step config for an agent
export function getPipelineStep(agentSlug: string): PipelineStep | undefined {
  return PIPELINE_CONFIG.find(s => s.agentSlug === agentSlug)
}

// Save pipeline state to agent_messages metadata
export async function savePipelineState(
  messageId: string,
  pipelineData: {
    pipeline_id?: string
    triggered_by?: string
    triggered_by_message_id?: string
    downstream_agents?: string[]
    pipeline_status?: string
  }
) {
  const { data: msg } = await supabaseAdmin
    .from('agent_messages')
    .select('input_payload')
    .eq('id', messageId)
    .single()

  const existing = (msg?.input_payload as Record<string, unknown>) || {}

  await supabaseAdmin
    .from('agent_messages')
    .update({
      input_payload: { ...existing, pipeline: pipelineData },
    })
    .eq('id', messageId)
}

// Get approved output from an upstream agent for a project
export async function getApprovedAgentOutput(
  projectId: string,
  userId: string,
  agentName: string
): Promise<Record<string, unknown> | null> {
  const { data } = await supabaseAdmin
    .from('agent_messages')
    .select('output_payload, agent:agents(name)')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (!data) return null

  const match = data.find((m: Record<string, unknown>) => {
    const agent = m.agent as { name: string } | null
    return agent?.name === agentName
  })

  return (match?.output_payload as Record<string, unknown>) || null
}

// Trigger an agent run via internal API call
export async function triggerAgent(
  agentSlug: string,
  projectId: string,
  userId: string,
  triggeredBy?: { agentSlug: string; messageId: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const body: Record<string, unknown> = { project_id: projectId }

    if (agentSlug === 'cmo-review' && triggeredBy?.messageId) {
      body.message_id = triggeredBy.messageId
      delete body.project_id
    }

    const res = await fetch(`${baseUrl}/api/agents/${agentSlug}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      return { success: false, error: err.error || `Agent ${agentSlug} failed` }
    }

    const result = await res.json()
    const messageId = result.id || result.message_id

    if (messageId && triggeredBy) {
      await savePipelineState(messageId, {
        triggered_by: triggeredBy.agentSlug,
        triggered_by_message_id: triggeredBy.messageId,
      })
    }

    await logActivity({
      user_id: userId,
      project_id: projectId,
      agent_id: undefined,
      event_type: 'pipeline.agent_triggered',
      event_description: `Pipeline triggered ${agentSlug}${triggeredBy ? ` (after ${triggeredBy.agentSlug})` : ''}`,
      metadata: { agent_slug: agentSlug, triggered_by: triggeredBy?.agentSlug, message_id: messageId },
    })

    return { success: true, messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: msg }
  }
}

// Run the full pipeline for a project starting from a specific agent
export async function runPipeline(
  startAgent: string,
  projectId: string,
  userId: string,
  options?: { skipCMO?: boolean }
): Promise<{ results: Array<{ agent: string; success: boolean; messageId?: string; error?: string }> }> {
  const results: Array<{ agent: string; success: boolean; messageId?: string; error?: string }> = []

  // Run the starting agent
  const startResult = await triggerAgent(startAgent, projectId, userId)
  results.push({ agent: startAgent, ...startResult })

  if (!startResult.success || !startResult.messageId) return { results }

  // Auto-trigger CMO if configured
  if (!options?.skipCMO && shouldAutoTriggerCMO(startAgent)) {
    const cmoResult = await triggerAgent('cmo-review', projectId, userId, {
      agentSlug: startAgent,
      messageId: startResult.messageId,
    })
    results.push({ agent: 'cmo-review', ...cmoResult })
  }

  // Auto-trigger downstream agents that don't require approval
  const autoDownstream = getAutoTriggerAgents(startAgent)
  for (const step of autoDownstream) {
    const downResult = await triggerAgent(step.agentSlug, projectId, userId, {
      agentSlug: startAgent,
      messageId: startResult.messageId,
    })
    results.push({ agent: step.agentSlug, ...downResult })
  }

  return { results }
}

// Called when a message is approved — triggers downstream agents
export async function onMessageApproved(
  messageId: string,
  userId: string
): Promise<{ triggered: string[]; errors: string[] }> {
  const { data: message } = await supabaseAdmin
    .from('agent_messages')
    .select('*, agent:agents(id, name)')
    .eq('id', messageId)
    .single()

  if (!message) return { triggered: [], errors: ['Message not found'] }

  const agentName = (message.agent as { id: string; name: string } | null)?.name
  if (!agentName) return { triggered: [], errors: ['Agent not found on message'] }

  // Map agent name to slug
  const agentSlug = agentNameToSlug(agentName)
  if (!agentSlug) return { triggered: [], errors: [] }

  const projectId = message.project_id
  if (!projectId) return { triggered: [], errors: ['No project on message'] }

  // Also save the approved output to the project's approved fields
  await saveApprovedToProject(agentSlug, projectId, message.output_payload as Record<string, unknown>)

  const downstream = getDownstreamAgents(agentSlug, true)
  const triggered: string[] = []
  const errors: string[] = []

  for (const step of downstream) {
    const result = await triggerAgent(step.agentSlug, projectId, userId, {
      agentSlug,
      messageId,
    })
    if (result.success) {
      triggered.push(step.agentSlug)

      // Auto-trigger CMO for downstream agents
      if (result.messageId && shouldAutoTriggerCMO(step.agentSlug)) {
        await triggerAgent('cmo-review', projectId, userId, {
          agentSlug: step.agentSlug,
          messageId: result.messageId,
        })
        triggered.push(`cmo-review (for ${step.agentSlug})`)
      }
    } else {
      errors.push(`${step.agentSlug}: ${result.error}`)
    }
  }

  await logActivity({
    user_id: userId,
    project_id: projectId,
    agent_id: (message.agent as { id: string })?.id,
    event_type: 'pipeline.downstream_triggered',
    event_description: `Approved ${agentName} → triggered ${triggered.length} downstream agents`,
    metadata: { triggered, errors, message_id: messageId },
  })

  return { triggered, errors }
}

// Map agent display names to URL slugs
function agentNameToSlug(name: string): string | null {
  const map: Record<string, string> = {
    'Product Strategy Agent': 'product-strategy',
    'CMO Review Agent': 'cmo-review',
    'Content Agent': 'content',
    'Outreach Agent': 'outreach',
    'Landing Page Agent': 'landing-page',
    'Lead Research Agent': 'lead-research',
    'Carousel / One-Pager Agent': 'carousel-design',
    'Proposal Agent': 'proposal',
    'Image Prompt Agent': 'image-prompt',
    'Weekly CEO Report Agent': 'weekly-ops',
    'ICP & Market Research Agent': 'lead-research',
  }
  return map[name] || null
}

// Save approved agent output back to the project's approved_ fields
async function saveApprovedToProject(
  agentSlug: string,
  projectId: string,
  output: Record<string, unknown>
) {
  if (agentSlug !== 'product-strategy' || !output) return

  const updates: Record<string, unknown> = {}

  if (output.one_line_offer) updates.approved_offer = output.one_line_offer
  if (output.approved_cta || output.landing_page_angle) {
    const lp = output.landing_page_angle as Record<string, string> | undefined
    updates.approved_cta = output.approved_cta || lp?.cta || null
  }

  if (output.positioning) updates.approved_positioning = output.positioning
  if (output.target_customer) {
    updates.approved_icp = {
      primary_icp: output.target_customer,
      buyer_titles: output.buyer_pains ? Object.keys(output.buyer_pains as Record<string, unknown>) : [],
    }
  }
  if (output.pricing || output.offer_packages) {
    updates.approved_pricing = output.pricing || output.offer_packages
  }

  if (Object.keys(updates).length > 0) {
    await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', projectId)
  }
}
