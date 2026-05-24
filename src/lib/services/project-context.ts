import { supabaseAdmin } from '@/lib/supabase/server'
import { getKnowledgeForAgent, formatKnowledgeForPrompt } from './agent-knowledge'

export interface ProjectContext {
  project: Record<string, unknown>
  profile: Record<string, unknown> | null
  contentAssets?: Record<string, unknown>[]
  knowledge?: string
}

export async function buildProjectContext(
  projectId: string,
  userId: string,
  options?: { includeContent?: boolean; agentName?: string }
): Promise<ProjectContext | null> {
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (error || !project) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  let contentAssets: Record<string, unknown>[] | undefined
  if (options?.includeContent) {
    const { data } = await supabaseAdmin
      .from('content_assets')
      .select('id, content_type, title, cta, status')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10)
    contentAssets = (data as Record<string, unknown>[]) || []
  }

  let knowledge: string | undefined
  if (options?.agentName) {
    try {
      const knowledgeEntries = await getKnowledgeForAgent(userId, options.agentName)
      if (knowledgeEntries.length > 0) {
        knowledge = formatKnowledgeForPrompt(knowledgeEntries)
      }
    } catch {
      // Knowledge store might not exist yet
    }
  }

  return { project, profile, contentAssets, knowledge }
}

export function formatApprovedStrategy(project: Record<string, unknown>): string {
  const positioning = project.approved_positioning as Record<string, string> | null
  const icp = project.approved_icp as Record<string, unknown> | null
  const pricing = project.approved_pricing as Record<string, string> | null

  return `APPROVED OFFER: ${project.approved_offer || 'Not set'}

APPROVED POSITIONING:
- Category: ${positioning?.category || 'Not set'}
- Differentiation: ${positioning?.differentiation || 'Not set'}
- Why now: ${positioning?.why_now || 'Not set'}
- Proof angle: ${positioning?.proof_angle || 'Not set'}

APPROVED ICP:
- Primary: ${icp?.primary_icp || 'Not set'}
- Secondary: ${icp?.secondary_icp || 'Not set'}
- Buyer titles: ${Array.isArray(icp?.buyer_titles) ? (icp.buyer_titles as string[]).join(', ') : 'Not set'}
- Company size: ${icp?.company_size || 'Not set'}

APPROVED PRICING:
- Pilot: ${pricing?.pilot_price || 'Not set'}
- Standard: ${pricing?.standard_price || 'Not set'}
- Upsell: ${pricing?.upsell || 'Not set'}

APPROVED CTA: ${project.approved_cta || 'Not set'}

PROJECT:
- Name: ${project.name}
- Description: ${project.description || 'Not provided'}
- Problem solved: ${project.problem_solved || 'Not specified'}
- Proof/background: ${project.proof_or_background || 'Not provided'}

${project.project_memory_summary ? `PROJECT MEMORY:\n${project.project_memory_summary}` : ''}`
}
