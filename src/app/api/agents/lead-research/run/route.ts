import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { buildProjectContext, formatApprovedStrategy } from '@/lib/services/project-context'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You are a senior B2B ICP architect and outbound strategist working at the level of Outbound Squad, Pavilion, and 30MPC.

═══════════════════════════════════════════════
CRITICAL: WHAT YOU DO NOT DO
═══════════════════════════════════════════════

You DO NOT invent company names. You DO NOT fabricate contact people. You have no live internet access — any "specific company" you name will be HALLUCINATED and harm the user.

Instead, you produce a precise ICP DEFINITION + APOLLO-READY SEARCH STRATEGY that the user (or our Apollo integration) will execute to pull REAL companies and contacts.

═══════════════════════════════════════════════
WHAT YOU DO PRODUCE
═══════════════════════════════════════════════

1. SHARP ICP DEFINITION
   - Firmographics: industry codes (NAICS/SIC), employee count band, revenue band, funding stage
   - Buying-trigger signals: hiring [specific role], using [specific tech], recent [specific event]
   - Disqualifiers: company traits that MUST exclude them (e.g. "uses competitor X with active contract")
   - Decision-maker titles + adjacent stakeholder titles (champion vs. economic buyer vs. blocker)

2. APOLLO SEARCH FILTERS (ready to paste)
   - Specific job titles to filter on (with synonyms — "Head of RevOps" + "VP Operations" + "Director of Sales Operations")
   - Industry filters (Apollo-compatible names)
   - Employee count brackets
   - Technology filters (companies using specific stack)
   - Keyword filters for company description / news

3. LINKEDIN SALES NAVIGATOR QUERIES
   - Boolean searches that work in LinkedIn Sales Nav
   - Saved-search definitions

4. QUALIFICATION RUBRIC (0-100 scoring)
   - Concrete weight per criterion: e.g. "Title match 30pts, Industry match 25pts, Company size 20pts, Tech stack 15pts, Recent funding 10pts"
   - Threshold for "hot lead" vs. "warm" vs. "skip"

5. PAIN-POINT MAP (per persona)
   - Champion's pain
   - Economic buyer's pain
   - Blocker's likely objection
   - One verifiable signal that means "they're feeling the pain RIGHT NOW"

═══════════════════════════════════════════════
QUALITY BAR
═══════════════════════════════════════════════

Every filter must be:
- COPY-PASTE READY into Apollo or Sales Nav
- SPECIFIC enough to return < 5,000 companies (not 500K)
- TIED to a verifiable buying signal, not vibes

ZERO TOLERANCE:
✗ Fabricated company names ("Acme Corp", "TechFlow Inc")
✗ Made-up contact people
✗ Vague filters ("growing tech companies", "innovative SaaS")
✗ Generic personas ("decision makers", "growth-minded teams")

Respond with ONLY valid JSON matching the exact schema provided. No markdown, no code fences.\``

const OUTPUT_SCHEMA = `{
  "agent_name": "Lead Research Agent",
  "status": "needs_review",
  "summary": "<1-2 sentence summary of the targeting strategy>",
  "ideal_customer_profile": {
    "industry_codes": ["<NAICS or SIC code with description>"],
    "industries_apollo": ["<industry name as Apollo lists it>"],
    "employee_count_min": 0,
    "employee_count_max": 0,
    "revenue_band": "<e.g. '$5M-$50M ARR'>",
    "funding_stage": ["<seed|series_a|series_b|bootstrapped|public|none>"],
    "geography": "<target regions, country list>",
    "tech_stack_required": ["<tech they MUST use>"],
    "tech_stack_excluded": ["<tech that means they're already served>"],
    "buying_signals": ["<recent hiring [role]>", "<funding announcement>", "<job posting keyword>"],
    "disqualifiers": ["<reason to exclude>"]
  },
  "decision_makers": {
    "champion_titles": ["<title likely to feel the pain>"],
    "economic_buyer_titles": ["<title with budget>"],
    "blocker_titles": ["<title that might say no>"],
    "title_synonyms": {
      "<canonical_title>": ["<synonym 1>", "<synonym 2>"]
    }
  },
  "apollo_filters": {
    "person_titles": ["<list of titles to OR-filter>"],
    "person_seniorities": ["<owner|founder|c_suite|partner|vp|head|director|manager>"],
    "person_locations": ["<country or region>"],
    "organization_industries": ["<Apollo industry tag>"],
    "organization_num_employees_ranges": ["<e.g. '11,50' or '51,200'>"],
    "organization_keyword_tags": ["<keyword that filters company description>"],
    "technologies": ["<tech filter>"],
    "ready_to_paste_query_string": "<a description the user can paste into Apollo's search bar>"
  },
  "linkedin_sales_nav": {
    "boolean_queries": ["<full Boolean string>"],
    "filter_recipe": "<step-by-step recipe to set up the saved search>"
  },
  "qualification_rubric": {
    "scoring_criteria": [
      { "criterion": "<criterion>", "weight_points": 30, "how_to_check": "<how>" }
    ],
    "hot_threshold": 70,
    "warm_threshold": 50,
    "skip_threshold": 30
  },
  "pain_map": [
    {
      "persona": "<champion|economic_buyer|blocker>",
      "title": "<their title>",
      "core_pain": "<their Monday-morning pain>",
      "live_signal": "<verifiable signal they're feeling it RIGHT NOW>",
      "outreach_angle": "<the line that gets them to reply>"
    }
  ],
  "recommended_next_action": "<what to do with this — typically 'Run Apollo prospect tool with these filters'>",
  "requires_human": true,
  "confidence": 0.0
}`

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const projectId = body.project_id
  if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 })

  const ctx = await buildProjectContext(projectId, userId)
  if (!ctx) return Response.json({ error: 'Project not found' }, { status: 404 })

  if (!ctx.project.approved_offer) {
    return Response.json({ error: 'Run and approve Product Strategy Agent first.' }, { status: 400 })
  }

  const agent = await lookupAgent('Lead Research Agent')
  if (!agent) return Response.json({ error: 'Lead Research Agent not found in database.' }, { status: 500 })

  await logActivity({
    user_id: userId, project_id: projectId, agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: `Lead Research Agent started for "${ctx.project.name}"`,
  })

  const userPrompt = `Create a precise ICP definition and lead search strategy for this product/offer.

${formatApprovedStrategy(ctx.project)}

TARGET MARKET: ${ctx.project.target_buyer || 'Derive from the approved strategy'}
PRODUCT: ${ctx.project.name}

Requirements:
1. Define the EXACT ideal customer profile (firmographics, technographics, buying signals)
2. Create COPY-PASTE-READY Apollo search filters I can use immediately
3. Write LinkedIn Sales Navigator Boolean queries
4. Build a qualification scoring rubric (0-100)
5. Map the pain points per persona (champion, economic buyer, blocker)
6. Include the specific outreach angle for each persona

DO NOT invent company names. Output a SEARCH STRATEGY, not a lead list.
The goal is: I paste your filters into Apollo/Sales Nav and get 50-200 real, qualified prospects.

Respond with ONLY the JSON matching this schema:
${OUTPUT_SCHEMA}`

  try {
    const result = await runAI({
      taskType: 'lead-research',
      preferredProvider: 'anthropic',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 4096,
    })

    const parsed = tryParseJSON(result.text)
    if (!parsed) {
      await logActivity({
        user_id: userId, project_id: projectId, agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'Lead Research Agent returned invalid JSON',
      })
      return Response.json({ error: 'AI returned invalid JSON.' }, { status: 422 })
    }

    const saved = await createAgentMessage({
      userId, projectId, agentId: agent.id, agentName: 'Lead Research Agent',
      title: `Lead Research: ${ctx.project.name}`,
      summary: (parsed.summary as string) || 'Lead research completed',
      messageType: 'lead_research',
      outputPayload: parsed,
      inputPayload: { project_id: projectId },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    })

    return Response.json(saved, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logActivity({
      user_id: userId, project_id: projectId, agent_id: agent.id,
      event_type: 'agent.output_failed',
      event_description: `Lead Research Agent failed: ${msg}`,
    })
    return Response.json({ error: `AI API call failed: ${msg}` }, { status: 500 })
  }
}
