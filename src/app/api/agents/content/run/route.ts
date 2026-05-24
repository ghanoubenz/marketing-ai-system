import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { buildProjectContext, formatApprovedStrategy } from '@/lib/services/project-context'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You write LinkedIn content at the level of Justin Welsh, Chris Walker, Dickie Bush, and Sahil Bloom. Posts that book sales calls, not posts that fish for likes.

You apply proven hook formulas (not generic "tip" intros), and every piece of content earns the right to its CTA.

═══════════════════════════════════════════════
HOOK FORMULAS (the only ones that work in 2026)
═══════════════════════════════════════════════

Pick a different hook formula for each post. Never use the same opener twice.

1. CONTRARIAN STAT
   "73% of B2B websites fail the 5-second test. Yours might be one."

2. SPECIFIC NUMBER + UNEXPECTED CLAIM
   "I rejected $40K in revenue last month. Here's why it was the right call."

3. STATUS QUO BREAK
   "Outbound isn't dead. The way most companies do outbound is."

4. MISTAKE CONFESSION (founder lens)
   "I lost a $25K client because of one line in our proposal. Here's the line."

5. NUMBERED LIST PROMISE
   "5 ways founders accidentally signal 'we're cheap' on their pricing page."

6. BEFORE/AFTER STATE
   "From 12% to 47% reply rate. Here's what changed in our cold email."

7. INSIDER OBSERVATION
   "I review 30+ B2B websites a month. The same 3 mistakes show up every time."

8. QUESTION THAT TRIGGERS SELF-AUDIT
   "When was the last time someone landed on your homepage and bought without a call?"

═══════════════════════════════════════════════
POST STRUCTURE (300-400 words for premium posts)
═══════════════════════════════════════════════

LINE 1: Hook (1 line, max 12 words)
LINE 2: Empty
LINE 3-5: Context (specific situation, who this applies to)
LINE 6+: The meat — usually 3-5 short paragraphs, each 1-2 sentences max
LAST LINE: Soft CTA tied to the approved offer

Use line breaks aggressively. Every sentence on its own line for the hook + meat.

═══════════════════════════════════════════════
ZERO TOLERANCE WORDS
═══════════════════════════════════════════════
✗ "Leverage", "unlock", "synergy", "transformative", "game-changer"
✗ "Landscape", "ecosystem", "journey", "navigate", "delve", "tapestry"
✗ "In today's fast-paced world..." / "It's no secret that..."
✗ "Without further ado", "at the end of the day", "circle back"
✗ Generic motivation: "the only way is up", "consistency is key", "trust the process"
✗ Emoji bullet lists with 🚀✨💯 etc. (one emoji max in the whole post)

═══════════════════════════════════════════════
CONTENT TYPES (each follows a different proven pattern)
═══════════════════════════════════════════════

problem        → name the specific pain in buyer's exact words
mistake        → confess or expose a specific costly mistake
before_after   → concrete metric change (X to Y) with the lever that moved it
educational    → 3-step framework or checklist, not theory
objection      → address the #1 reason this offer doesn't get bought
proof          → case study compressed: company → problem → result in 100 words
direct_offer   → straight pitch with the offer's mechanism explained
founder_insight → contrarian POV grounded in real experience
checklist      → "5 signs you need ___" / "Quick audit: are you ___"
why_now        → market shift creating urgency (real, not invented)

═══════════════════════════════════════════════
PROOF & HONESTY — CRITICAL
═══════════════════════════════════════════════

NEVER fabricate statistics, case studies, or client results in posts.
- Hook examples like "73% of B2B websites fail..." are TEMPLATES — replace with the operator's REAL numbers if available
- If the operator has proof points, use them. If not, use hooks that don't require proof (questions, contrarian takes, frameworks)
- For "before_after" and "proof" content types: ONLY use data the operator provided. If none exists, switch to a different content type
- Mark any placeholder stats with [YOUR_METRIC] so the operator knows to fill them in

Respond with ONLY valid JSON matching the exact schema provided. No markdown, no code fences.`

const OUTPUT_SCHEMA = `{
  "agent_name": "Content Agent",
  "status": "needs_review",
  "summary": "<1-2 sentence summary of the content strategy>",
  "linkedin_posts": [
    {
      "type": "<problem|mistake|before_after|educational|objection|proof|direct_offer|founder_insight|checklist|why_now>",
      "title": "<internal reference title>",
      "body": "<full post text, 150-300 words, ready to post>",
      "cta": "<clear CTA at the end>",
      "visual_direction": "<suggested image/visual description>"
    }
  ],
  "carousel_outlines": [
    {
      "title": "<carousel title>",
      "target_reader": "<who this carousel is for>",
      "business_goal": "<what business result this drives>",
      "carousel_angle": "<which framework angle this uses>",
      "slides": [
        {
          "slide_number": 1,
          "slide_role": "<Hook|Problem|Insight|Framework|Proof|Outcome|CTA>",
          "headline": "<big text, max 8 words>",
          "body": "<supporting text, max 25 words>",
          "visual_direction": "<what this slide should look like>",
          "layout_direction": "<centered text|left-aligned with icon|split layout|full-bleed stat>"
        }
      ],
      "design_style": {
        "tone": "premium B2B LinkedIn",
        "colors": "<2-3 colors>",
        "typography": "<font style>",
        "layout": "<overall layout approach>",
        "avoid": ["<thing to avoid>"]
      },
      "cta": "<final CTA>",
      "image_prompts": ["<prompt for cover image>", "<prompt for key visual>"]
    }
  ],
  "one_pager_outline": {
    "title": "<one-pager title>",
    "sections": ["<section 1>", "<section 2>", "<section 3>"],
    "cta": "<one-pager CTA>"
  },
  "weekly_calendar": [
    { "day": "Monday", "content_type": "<type>", "topic": "<topic>" },
    { "day": "Tuesday", "content_type": "<type>", "topic": "<topic>" },
    { "day": "Wednesday", "content_type": "<type>", "topic": "<topic>" },
    { "day": "Thursday", "content_type": "<type>", "topic": "<topic>" },
    { "day": "Friday", "content_type": "<type>", "topic": "<topic>" }
  ],
  "recommended_next_action": "<what to do with this content>",
  "requires_human": true,
  "confidence": 0.0
}`

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const projectId = body.project_id
  if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 })

  const ctx = await buildProjectContext(projectId, userId, { includeContent: true, agentName: 'Content Agent' })
  if (!ctx) return Response.json({ error: 'Project not found' }, { status: 404 })

  if (!ctx.project.approved_offer) {
    return Response.json({ error: 'Run and approve Product Strategy Agent first.' }, { status: 400 })
  }

  const agent = await lookupAgent('Content Agent')
  if (!agent) return Response.json({ error: 'Content Agent not found in database.' }, { status: 500 })

  await logActivity({
    user_id: userId, project_id: projectId, agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: `Content Agent started for "${ctx.project.name}"`,
  })

  const userPrompt = `Create a premium LinkedIn content package for this B2B offer.

${formatApprovedStrategy(ctx.project)}
${ctx.knowledge || ''}

QUALITY OVER QUANTITY. Generate:
- 5 LinkedIn posts (NOT 10). Each must be premium quality, 250-400 words, using a DIFFERENT hook formula. Pick the 5 highest-leverage types for THIS offer from: problem, mistake, before_after, educational, objection, proof, direct_offer, founder_insight, checklist, why_now
- 2 carousel outlines (7 slides each). Different angles. Detailed slide-by-slide.
- 1 one-pager outline
- 1 weekly content calendar (5 days, each tied to a specific business outcome)

For carousels: include slide-by-slide structure with role + headline + body + visual direction. Use the dedicated Carousel Agent for the actual image generation pipeline — this output is the WRITING side.

Every post must:
- Open with a hook from the formulas list (vary which formula per post)
- Reference a specific buyer pain in their exact Monday-morning words
- End with a soft CTA tied to the approved offer (not a hard sell)

NEVER use generic motivational content. NEVER use the banned words list.

Respond with ONLY the JSON matching this schema:
${OUTPUT_SCHEMA}`

  try {
    const result = await runAI({
      taskType: 'content',
      preferredProvider: 'anthropic',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 8192,
    })

    const parsed = tryParseJSON(result.text)
    if (!parsed) {
      await logActivity({
        user_id: userId, project_id: projectId, agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'Content Agent returned invalid JSON',
      })
      return Response.json({ error: 'AI returned invalid JSON.' }, { status: 422 })
    }

    const saved = await createAgentMessage({
      userId, projectId, agentId: agent.id, agentName: 'Content Agent',
      title: `LinkedIn Content: ${ctx.project.name}`,
      summary: (parsed.summary as string) || 'LinkedIn content package generated',
      messageType: 'content',
      outputPayload: parsed,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    })

    return Response.json(saved, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logActivity({
      user_id: userId, project_id: projectId, agent_id: agent.id,
      event_type: 'agent.output_failed',
      event_description: `Content Agent failed: ${msg}`,
    })
    return Response.json({ error: `AI API call failed: ${msg}` }, { status: 500 })
  }
}
