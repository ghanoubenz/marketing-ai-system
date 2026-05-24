import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { saveKnowledge } from '@/lib/services/agent-knowledge'
import { logActivity } from '@/lib/services/activity-log'
import { buildProjectContext } from '@/lib/services/project-context'
import { runGeminiDeepSearch } from '@/lib/ai/providers/gemini'
import { saveResearchToDrive } from '@/lib/services/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const SYSTEM_PROMPT = `You are a Research Agent — a senior marketing researcher who finds real, actionable knowledge from the internet to help B2B marketing agents improve their work.

═══════════════════════════════════════════════
YOUR MISSION
═══════════════════════════════════════════════

When another agent is stuck or producing generic output, YOU go find real expertise:
- Search Google for proven frameworks, case studies, and expert advice
- Search YouTube for tutorials, masterclasses, and strategy breakdowns
- Extract the SPECIFIC, ACTIONABLE takeaways — not summaries
- Save what you learn so every agent gets smarter over time

═══════════════════════════════════════════════
HOW YOU RESEARCH
═══════════════════════════════════════════════

1. UNDERSTAND THE NEED: What specific skill or knowledge gap needs filling?
2. SEARCH STRATEGY: Generate 3-5 specific search queries (Google + YouTube)
3. ANALYZE RESULTS: For each result, extract:
   - The core framework or method
   - Specific numbers, benchmarks, or templates
   - What makes this expert's approach different
   - How to apply it to B2B marketing specifically
4. SYNTHESIZE: Combine findings into actionable knowledge
5. CATEGORIZE: Tag which agents should use this knowledge

═══════════════════════════════════════════════
WHAT MAKES GOOD RESEARCH
═══════════════════════════════════════════════

GOOD: "Alex Hormozi's $100M Offers framework: step 1 is dream outcome + perceived likelihood of achievement - time delay - effort/sacrifice. The value equation. Apply to pricing page copy."
BAD: "There are many experts who discuss pricing strategies online."

GOOD: "Kyle Poyar's usage-based pricing research: companies using UBP grow 38% faster. Key metric: Net Dollar Retention above 120%. Apply to SaaS pricing tiers."
BAD: "Pricing is important for SaaS companies."

═══════════════════════════════════════════════
OUTPUT SCHEMA
═══════════════════════════════════════════════

Return JSON:
{
  "research_query": "what was researched and why",
  "search_queries_used": ["list of Google/YouTube searches performed"],
  "sources": [
    {
      "title": "source title",
      "url": "URL",
      "type": "youtube | article | google",
      "author": "who created this",
      "key_insight": "the ONE biggest takeaway",
      "specific_tactics": ["list of specific, actionable tactics found"],
      "numbers_or_benchmarks": ["any specific numbers, stats, or benchmarks"],
      "applicability": "how this applies to the current need"
    }
  ],
  "synthesized_knowledge": {
    "topic": "clear topic name",
    "category": "strategy | content | outreach | pricing | positioning | copywriting | lead_gen | sales | design | general",
    "key_takeaways": ["5-10 specific actionable takeaways"],
    "frameworks_found": ["named frameworks with brief descriptions"],
    "templates_or_formulas": ["any templates, formulas, or fill-in-the-blank formats found"],
    "applicable_agents": ["which agents should use this knowledge"],
    "confidence": 0.8
  },
  "recommendations": {
    "immediate_actions": ["what to do right now with this knowledge"],
    "agents_to_retrigger": ["which agents should re-run with this new knowledge"],
    "gaps_remaining": ["what still needs more research"]
  }
}`

async function searchGoogle(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const apiKey = process.env.GOOGLE_API_KEY
  const cx = process.env.GOOGLE_SEARCH_CX

  if (!apiKey || !cx) {
    return [{ title: `Search: ${query}`, url: '', snippet: 'Google API not configured. Set GOOGLE_API_KEY and GOOGLE_SEARCH_CX in .env.local' }]
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      cx,
      q: query,
      num: '5',
    })

    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`)
    if (!res.ok) return []

    const data = await res.json()
    return (data.items || []).map((item: Record<string, string>) => ({
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
    }))
  } catch {
    return []
  }
}

async function searchYouTube(query: string): Promise<Array<{ title: string; videoId: string; channelTitle: string; description: string }>> {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    return [{ title: `Search: ${query}`, videoId: '', channelTitle: '', description: 'YouTube API not configured. Set GOOGLE_API_KEY in .env.local' }]
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      part: 'snippet',
      q: `${query} B2B marketing`,
      type: 'video',
      maxResults: '5',
      order: 'relevance',
    })

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`)
    if (!res.ok) return []

    const data = await res.json()
    return (data.items || []).map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, string>
      const id = item.id as Record<string, string>
      return {
        title: snippet?.title || '',
        videoId: id?.videoId || '',
        channelTitle: snippet?.channelTitle || '',
        description: snippet?.description || '',
      }
    })
  } catch {
    return []
  }
}

async function getYouTubeTranscript(videoId: string): Promise<string | null> {
  if (!videoId) return null

  // Try the free transcript API
  try {
    const res = await fetch(`https://yt.lemnoslife.com/noKey/captions?part=snippet&videoId=${videoId}`)
    if (!res.ok) return null

    const data = await res.json()
    const items = data?.items || []
    if (items.length === 0) return null

    // Get the first available caption track
    const captionId = items[0]?.id
    if (!captionId) return null

    const captionRes = await fetch(`https://yt.lemnoslife.com/noKey/captions/${captionId}`)
    if (!captionRes.ok) return null

    const captionText = await captionRes.text()
    // Limit transcript length to avoid token bloat
    return captionText.slice(0, 5000)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const { project_id, query, triggered_by, context } = body

  if (!query) return Response.json({ error: 'query is required — what should the agent research?' }, { status: 400 })

  const agent = await lookupAgent('Learning Agent')
  if (!agent) return Response.json({ error: 'Research Agent not found in database. Add it to agents table.' }, { status: 500 })

  let projectContext = ''
  if (project_id) {
    const ctx = await buildProjectContext(project_id, userId)
    if (ctx) {
      projectContext = `\nPROJECT CONTEXT:\n- Name: ${(ctx.project as Record<string, string>).name}\n- Description: ${(ctx.project as Record<string, string>).description || 'Not provided'}\n- Industry: ${(ctx.project as Record<string, string>).industry || 'Not specified'}\n- Target buyer: ${(ctx.project as Record<string, string>).target_buyer || 'Not specified'}`
    }
  }

  await logActivity({
    user_id: userId,
    project_id: project_id || null,
    agent_id: agent.id,
    event_type: 'research.started',
    event_description: `Research started: ${query}`,
    metadata: { query, triggered_by },
  })

  // Step 1: Generate search queries using AI
  const queryGenResult = await runAI({
    taskType: 'research',
    preferredProvider: 'anthropic',
    systemPrompt: 'Generate 3 Google search queries and 2 YouTube search queries to research the given topic for B2B marketing. Return JSON: { "google_queries": [...], "youtube_queries": [...] }',
    userPrompt: `Research topic: ${query}\n${projectContext}\n${context ? `Additional context: ${context}` : ''}\n\nReturn only JSON.`,
    maxTokens: 500,
  })

  const queries = tryParseJSON(queryGenResult.text) || {
    google_queries: [query, `${query} B2B strategy`, `${query} framework template`],
    youtube_queries: [`${query} tutorial`, `${query} masterclass`],
  }

  // Step 2: Execute searches
  const googleQueries = (queries.google_queries as string[]) || [query]
  const youtubeQueries = (queries.youtube_queries as string[]) || [query]

  const allGoogleResults: Array<{ query: string; results: Array<{ title: string; url: string; snippet: string }> }> = []
  const allYouTubeResults: Array<{ query: string; results: Array<{ title: string; videoId: string; channelTitle: string; description: string }> }> = []

  for (const q of googleQueries.slice(0, 3)) {
    const results = await searchGoogle(q)
    allGoogleResults.push({ query: q, results })
  }

  for (const q of youtubeQueries.slice(0, 2)) {
    const results = await searchYouTube(q)
    allYouTubeResults.push({ query: q, results })
  }

  // Step 3: Try to get transcripts from top YouTube results
  const topVideos = allYouTubeResults.flatMap(r => r.results).slice(0, 3)
  const transcripts: Array<{ videoId: string; title: string; transcript: string }> = []

  for (const video of topVideos) {
    if (video.videoId) {
      const transcript = await getYouTubeTranscript(video.videoId)
      if (transcript) {
        transcripts.push({ videoId: video.videoId, title: video.title, transcript })
      }
    }
  }

  // Step 3.5: Gemini Deep Search — real-time grounded research
  let geminiDeepContext = ''
  let geminiSources: Array<{ title: string; url: string; snippet: string }> = []
  if (process.env.GEMINI_API_KEY) {
    try {
      const deepResult = await runGeminiDeepSearch(`${query} B2B marketing strategy tactics frameworks 2026`)
      if (deepResult.answer) {
        geminiDeepContext = `\n\nGEMINI DEEP SEARCH (real-time grounded results):\n${deepResult.answer.slice(0, 6000)}`
        geminiSources = deepResult.sources
      }
    } catch (err) {
      console.error('Gemini deep search failed (non-critical):', err)
    }
  }

  // Step 4: Synthesize with AI
  const searchContext = `GOOGLE RESULTS:\n${allGoogleResults.map(g =>
    `Query: "${g.query}"\n${g.results.map(r => `- ${r.title}: ${r.snippet} (${r.url})`).join('\n')}`
  ).join('\n\n')}

YOUTUBE RESULTS:\n${allYouTubeResults.map(y =>
    `Query: "${y.query}"\n${y.results.map(r => `- ${r.title} by ${r.channelTitle}: ${r.description} (https://youtube.com/watch?v=${r.videoId})`).join('\n')}`
  ).join('\n\n')}

${transcripts.length > 0 ? `\nYOUTUBE TRANSCRIPTS (key content):\n${transcripts.map(t => `--- ${t.title} ---\n${t.transcript}`).join('\n\n')}` : ''}
${geminiDeepContext}

${geminiSources.length > 0 ? `\nGEMINI GROUNDED SOURCES:\n${geminiSources.map(s => `- ${s.title}: ${s.url}`).join('\n')}` : ''}`

  const result = await runAI({
    taskType: 'research',
    preferredProvider: 'anthropic',
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `RESEARCH QUERY: ${query}
${projectContext}
${triggered_by ? `TRIGGERED BY: ${triggered_by} agent needs help with this topic` : ''}
${context ? `CONTEXT: ${context}` : ''}

SEARCH RESULTS TO ANALYZE (from Google Custom Search, YouTube, AND Gemini Deep Search):
${searchContext}

Analyze these search results and YouTube content. Extract specific, actionable knowledge. Return your analysis as JSON matching the output schema.`,
    maxTokens: 4096,
  })

  const parsed = tryParseJSON(result.text)
  if (!parsed) {
    return Response.json({ error: 'Research agent returned invalid output' }, { status: 422 })
  }

  // Step 5: Save knowledge to the knowledge store
  const synthesized = parsed.synthesized_knowledge as Record<string, unknown> | undefined
  if (synthesized) {
    try {
      await saveKnowledge({
        userId,
        projectId: project_id || undefined,
        sourceType: 'google',
        sourceUrl: (parsed.sources as Array<Record<string, string>>)?.[0]?.url || undefined,
        sourceTitle: (synthesized.topic as string) || query,
        topic: (synthesized.topic as string) || query,
        category: (synthesized.category as KnowledgeEntry['category']) || 'general',
        keyTakeaways: (synthesized.key_takeaways as string[]) || [],
        fullSummary: JSON.stringify({
          frameworks: synthesized.frameworks_found,
          templates: synthesized.templates_or_formulas,
          sources: (parsed.sources as Array<Record<string, unknown>>)?.map(s => ({ title: s.title, url: s.url })),
        }),
        applicableAgents: (synthesized.applicable_agents as string[]) || [],
        confidence: (synthesized.confidence as number) || 0.7,
      })
    } catch (err) {
      console.error('Failed to save knowledge:', err)
    }
  }

  // Save YouTube-specific knowledge entries
  for (const transcript of transcripts) {
    if (synthesized) {
      try {
        await saveKnowledge({
          userId,
          projectId: project_id || undefined,
          sourceType: 'youtube',
          sourceUrl: `https://youtube.com/watch?v=${transcript.videoId}`,
          sourceTitle: transcript.title,
          topic: (synthesized.topic as string) || query,
          category: (synthesized.category as KnowledgeEntry['category']) || 'general',
          keyTakeaways: (synthesized.key_takeaways as string[])?.slice(0, 5) || [],
          applicableAgents: (synthesized.applicable_agents as string[]) || [],
          confidence: 0.6,
        })
      } catch {
        // Non-critical, continue
      }
    }
  }

  // Step 5.5: Save full research to Google Drive if it's large
  let driveFileUrl: string | null = null
  const totalContent = JSON.stringify(parsed).length
  if (totalContent > 5000) {
    try {
      driveFileUrl = await saveResearchToDrive({
        title: `Research: ${query}`,
        content: JSON.stringify(parsed, null, 2),
        query,
        sourcesCount: (parsed.sources as unknown[])?.length || 0,
        geminiUsed: !!geminiDeepContext,
      })
    } catch {
      // Google Drive save is optional
    }
  }

  // Step 6: Save as agent message
  const saved = await createAgentMessage({
    userId,
    projectId: project_id || '',
    agentId: agent.id,
    agentName: 'Research Agent',
    title: `Research: ${query}`,
    summary: `Found ${(parsed.sources as unknown[])?.length || 0} sources, extracted ${(synthesized?.key_takeaways as unknown[])?.length || 0} actionable takeaways${geminiDeepContext ? ' (with Gemini deep search)' : ''}`,
    messageType: 'report',
    outputPayload: {
      ...parsed,
      gemini_deep_search_used: !!geminiDeepContext,
      gemini_sources: geminiSources.length > 0 ? geminiSources : undefined,
      drive_file_url: driveFileUrl,
    },
    inputPayload: {
      query,
      triggered_by,
      search_queries: { google: googleQueries, youtube: youtubeQueries },
      transcripts_found: transcripts.length,
      gemini_used: !!geminiDeepContext,
    },
    confidence: (synthesized?.confidence as number) || 0.7,
  })

  await logActivity({
    user_id: userId,
    project_id: project_id || null,
    agent_id: agent.id,
    event_type: 'research.completed',
    event_description: `Research complete: ${query} — ${(parsed.sources as unknown[])?.length || 0} sources, ${transcripts.length} transcripts`,
    metadata: { message_id: saved.id, sources_count: (parsed.sources as unknown[])?.length || 0 },
  })

  return Response.json(saved, { status: 201 })
}

type KnowledgeEntry = {
  category: 'strategy' | 'content' | 'outreach' | 'pricing' | 'positioning' | 'copywriting' | 'lead_gen' | 'sales' | 'design' | 'general'
}
