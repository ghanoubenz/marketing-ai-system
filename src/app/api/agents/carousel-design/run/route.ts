import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { buildProjectContext, formatApprovedStrategy } from '@/lib/services/project-context'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SYSTEM_PROMPT = `You are a world-class LinkedIn carousel designer. You produce image prompts that gpt-image-2 will render into finished slide images.

YOUR JOB: For each slide, write ONE detailed image prompt. That prompt is the ONLY input gpt-image-2 gets — it must contain EVERYTHING: exact text to render, colors, fonts, layout, background, spacing, decorative elements.

═══════════════════════════════════════════════
DESIGN STYLE RULES
═══════════════════════════════════════════════

Pick ONE premium style and apply it consistently across ALL slides:

OPTION A — "McKinsey Dark"
- Background: Deep charcoal (#1C1C1E) or dark navy (#0F172A)
- Text: White headlines, light gray body text
- Accent: One bright color (electric blue #3B82F6 or emerald #10B981)
- Layout: Left-aligned text, accent bar on left edge, generous padding (80px+)
- Typography: Bold condensed sans-serif for headlines, thin sans-serif for body

OPTION B — "Google Clean"
- Background: Pure white (#FFFFFF) or very light gray (#F8FAFC)
- Text: Dark gray (#1E293B) headlines, medium gray body
- Accent: Google blue (#4285F4) for highlights and underlines
- Layout: Centered text, clean horizontal lines as dividers, lots of whitespace
- Typography: Product Sans / Geometric sans-serif, medium weight headlines

OPTION C — "Stripe Gradient"
- Background: Rich gradient (deep purple to dark blue, or dark teal to black)
- Text: White headlines with subtle glow, light gray body
- Accent: Vibrant gradient accent line or shape
- Layout: Center or left-aligned, floating geometric shapes in background
- Typography: Bold rounded sans-serif headlines, clean thin body

═══════════════════════════════════════════════
IMAGE PROMPT FORMAT
═══════════════════════════════════════════════

Every image_prompt MUST follow this exact structure:

"A professional LinkedIn carousel slide, [DIMENSIONS]. [BACKGROUND]. [LAYOUT AND SPACING]. [HEADLINE TEXT in exact quotes with font description]. [BODY TEXT in exact quotes with font description]. [DECORATIVE ELEMENTS]. [OVERALL MOOD]. No logos, no watermarks, no stock photos, no people."

CRITICAL RULES FOR PROMPTS:
- ALWAYS specify "1080x1350 pixels, portrait orientation, 4:5 aspect ratio"
- ALWAYS put the exact text to render in double quotes within the prompt
- ALWAYS specify exact hex colors for background, text, and accents
- ALWAYS describe font style (bold, thin, condensed, etc.) and approximate size
- ALWAYS include padding/margin descriptions (e.g. "80px padding on all sides")
- NEVER reference logos, brand names, or trademarked visual styles by name
- NEVER include photos of people or realistic illustrations
- Keep text minimal: headlines max 8 words, body max 15 words per slide

Respond with ONLY valid JSON.`

const OUTPUT_SCHEMA = `{
  "agent_name": "Carousel Design Agent",
  "status": "needs_review",
  "summary": "<1-sentence description>",
  "design_style_chosen": "<McKinsey Dark | Google Clean | Stripe Gradient>",
  "linkedin_caption": {
    "hook": "<first line visible in feed — max 15 words, stops the scroll>",
    "body": "<2-4 sentences expanding the value>",
    "cta": "<what you want them to do>",
    "hashtags": ["<3-5 hashtags>"]
  },
  "slides": [
    {
      "slide_number": 1,
      "slide_role": "<Hook|Problem|Insight|Breakdown|Framework|CTA>",
      "headline": "<exact text on the slide — max 8 words>",
      "body": "<supporting text — max 15 words, or empty>",
      "image_prompt": "<COMPLETE gpt-image-2 prompt following the format above. Must be self-contained — include ALL visual details.>"
    }
  ],
  "recommended_next_action": "Approve to generate all slide images",
  "requires_human": true,
  "confidence": 0.0
}`

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const projectId = body.project_id
  const topic = body.topic || null
  const style = body.style || null
  if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 })

  const ctx = await buildProjectContext(projectId, userId)
  if (!ctx) return Response.json({ error: 'Project not found' }, { status: 404 })

  if (!ctx.project.approved_offer) {
    return Response.json({ error: 'Run and approve Product Strategy Agent first.' }, { status: 400 })
  }

  const agent = await lookupAgent('Carousel / One-Pager Agent')
  if (!agent) return Response.json({ error: 'Carousel Agent not found in database.' }, { status: 500 })

  await logActivity({
    user_id: userId, project_id: projectId, agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: `Carousel Design Agent started for "${ctx.project.name}"`,
  })

  const userPrompt = `Design a premium LinkedIn carousel for this B2B offer.

${formatApprovedStrategy(ctx.project)}

${topic ? `TOPIC/ANGLE: ${topic}` : 'Pick the strongest angle from the strategy.'}
${style ? `DESIGN STYLE: Use "${style}" style.` : 'Pick the best style for this industry.'}

Create 7-8 slides: Hook → Problem → Insight → 3 Breakdowns → Framework → CTA

IMPORTANT:
- Each image_prompt must be a COMPLETE, self-contained prompt for gpt-image-2
- Include EXACT text to render, hex colors, font styles, layout, background, decorative elements
- All slides must share the same design system (same colors, same fonts, same layout logic)
- Write a linkedin_caption separately — this is the POST text, NOT on the slides

Industry: ${ctx.project.industry || 'B2B services'}
Audience: ${ctx.project.target_buyer || 'B2B decision makers'}

JSON schema:
${OUTPUT_SCHEMA}`

  try {
    const result = await runAI({
      taskType: 'carousel-design',
      preferredProvider: 'anthropic',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 6000,
    })

    const parsed = tryParseJSON(result.text)
    if (!parsed) {
      await logActivity({
        user_id: userId, project_id: projectId, agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'Carousel Design Agent returned invalid JSON',
      })
      return Response.json({ error: 'AI returned invalid JSON.' }, { status: 422 })
    }

    const saved = await createAgentMessage({
      userId, projectId, agentId: agent.id, agentName: 'Carousel Design Agent',
      title: `Carousel: ${(parsed as Record<string, unknown>).design_style_chosen || ''} — ${ctx.project.name}`,
      summary: (parsed.summary as string) || 'Carousel designed',
      messageType: 'content',
      outputPayload: parsed,
      inputPayload: { project_id: projectId, topic, style },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    })

    return Response.json(saved, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logActivity({
      user_id: userId, project_id: projectId, agent_id: agent.id,
      event_type: 'agent.output_failed',
      event_description: `Carousel Design Agent failed: ${msg}`,
    })
    return Response.json({ error: `AI API call failed: ${msg}` }, { status: 500 })
  }
}
