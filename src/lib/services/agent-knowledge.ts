import { supabaseAdmin } from '@/lib/supabase/server'

export interface KnowledgeEntry {
  id?: string
  userId: string
  projectId?: string
  sourceType: 'youtube' | 'google' | 'article' | 'agent_learning' | 'user_input'
  sourceUrl?: string
  sourceTitle?: string
  topic: string
  category: 'strategy' | 'content' | 'outreach' | 'pricing' | 'positioning' | 'copywriting' | 'lead_gen' | 'sales' | 'design' | 'general'
  keyTakeaways: string[]
  fullSummary?: string
  applicableAgents?: string[]
  confidence?: number
}

export async function saveKnowledge(entry: KnowledgeEntry) {
  const { data, error } = await supabaseAdmin
    .from('agent_knowledge')
    .insert({
      user_id: entry.userId,
      project_id: entry.projectId || null,
      source_type: entry.sourceType,
      source_url: entry.sourceUrl || null,
      source_title: entry.sourceTitle || null,
      topic: entry.topic,
      category: entry.category,
      key_takeaways: entry.keyTakeaways,
      full_summary: entry.fullSummary || null,
      applicable_agents: entry.applicableAgents || [],
      confidence: entry.confidence ?? 0.7,
    })
    .select()
    .single()

  if (error) throw new Error('Failed to save knowledge: ' + error.message)
  return data
}

export async function getKnowledgeForAgent(
  userId: string,
  agentName: string,
  category?: string,
  limit = 10
): Promise<Array<Record<string, unknown>>> {
  let query = supabaseAdmin
    .from('agent_knowledge')
    .select('*')
    .eq('user_id', userId)
    .order('times_used', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (category) {
    query = query.eq('category', category)
  }

  const { data } = await query

  if (!data) return []

  // Filter to entries that mention this agent or are general
  return data.filter((k: Record<string, unknown>) => {
    const applicable = k.applicable_agents as string[] | null
    if (!applicable || applicable.length === 0) return true
    return applicable.some(a => a.toLowerCase().includes(agentName.toLowerCase()))
  })
}

export async function searchKnowledge(
  userId: string,
  topic: string,
  limit = 5
): Promise<Array<Record<string, unknown>>> {
  const { data } = await supabaseAdmin
    .from('agent_knowledge')
    .select('*')
    .eq('user_id', userId)
    .ilike('topic', `%${topic}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

export async function incrementKnowledgeUsage(id: string) {
  try {
    const { error } = await supabaseAdmin.rpc('increment_knowledge_usage', { knowledge_id: id })
    if (error) {
      await supabaseAdmin
        .from('agent_knowledge')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id)
    }
  } catch {
    // Knowledge usage tracking is non-critical
  }
}

export async function getAllKnowledge(userId: string, limit = 50) {
  const { data } = await supabaseAdmin
    .from('agent_knowledge')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

export function formatKnowledgeForPrompt(knowledge: Array<Record<string, unknown>>): string {
  if (!knowledge.length) return ''

  const sections = knowledge.map((k, i) => {
    const takeaways = (k.key_takeaways as string[]) || []
    return `[${i + 1}] ${k.topic} (from ${k.source_type}: ${k.source_title || 'unknown'})
${takeaways.map(t => `  - ${t}`).join('\n')}
${k.full_summary ? `  Summary: ${k.full_summary}` : ''}`
  })

  return `\n═══════════════════════════════════════════════
LEARNED KNOWLEDGE (from research)
═══════════════════════════════════════════════
${sections.join('\n\n')}`
}
