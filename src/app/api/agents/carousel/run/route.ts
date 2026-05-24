import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { buildProjectContext, formatApprovedStrategy } from '@/lib/services/project-context'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { logActivity } from '@/lib/services/activity-log'
import { generateImageBatch } from '@/lib/services/image-generator'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 600

const SYSTEM_PROMPT = `You are the Creative Director for a top-1% B2B LinkedIn carousel studio. You produce carousels that consistently hit 500K+ impressions and book sales calls — not vanity content.

You write image prompts for OpenAI's gpt-image-2 (April 2026 release, the SOTA reasoning image model). gpt-image-2 renders text accurately, so each slide has its OWN image with the slide's headline rendered IN the image — no separate text overlays needed.

═══════════════════════════════════════════════
CAROUSEL ARCHITECTURE (7 slides, fixed roles)
═══════════════════════════════════════════════

Slide 1 — HOOK
Bold provocative claim, contrarian stat, or sharp question. Stops the scroll in 1 second.
Examples: "Your funnel is leaking 40% of revenue.", "Most B2B websites are designed by accident.", "Outbound is dead. Here's what replaced it."

Slide 2 — PROBLEM
The specific pain the buyer feels every Monday morning. Concrete, recognizable.

Slide 3 — INSIGHT
The reframe. Why the obvious answer is wrong. The non-obvious truth.

Slide 4 — FRAMEWORK
The 3-part / 4-part method. Numbered. Visual hierarchy.

Slide 5 — PROOF
A specific result. A number. A case study compressed to one sentence.

Slide 6 — OUTCOME
What changes when they fix it. Tangible business result.

Slide 7 — CTA
Soft offer tied to the approved offer. Low-friction next step.

═══════════════════════════════════════════════
SLIDE COPY RULES
═══════════════════════════════════════════════
- Max 12 words per slide headline
- Max 25 words per slide body
- One idea per slide. Zero exceptions.
- No bullet dumps. No walls of text.
- Each slide must work standalone if screenshotted

═══════════════════════════════════════════════
VISUAL SYSTEM RULES (CRITICAL)
═══════════════════════════════════════════════

ALL 7 slides MUST share an identical visual system:
- Same primary/secondary/accent hex codes
- Same typography (font family + weights)
- Same lighting signature
- Same material/texture vocabulary
- Same composition grid

Slide-level visual variation (allowed):
- Position of focal element (centered, left, right, full-bleed)
- Imagery type (typographic-only, abstract shape, data viz, photographic element)
- Background treatment (solid, subtle gradient, paper texture)

═══════════════════════════════════════════════
PROMPT FORMULA FOR EACH SLIDE
═══════════════════════════════════════════════

[SLIDE ROLE & COMPOSITION] + [TEXT CONTENT IN QUOTES] + [TYPOGRAPHY SPEC] + [COLOR PALETTE with hex] + [VISUAL ELEMENT] + [BACKGROUND TREATMENT] + [LIGHTING/TEXTURE]

Example for a Hook slide:
"Square 1:1 carousel cover slide. Centered headline reading 'Your funnel is leaking 40% of revenue' in Söhne Halbfett, 96pt, color #0A2540 deep navy on a #F6F9FC paper-white background. Subtle horizontal grain texture suggesting matte fine-art paper. Single thin #FF5C35 warm orange accent line beneath the text, 4px thick, 60% width. No other elements. Generous negative space top and bottom. Editorial magazine aesthetic, Bauhaus restraint. Soft diffused lighting from upper left, very subtle paper grain. Quiet confidence."

═══════════════════════════════════════════════
STRICT NEGATIVES (DO NOT INCLUDE)
═══════════════════════════════════════════════
✗ "Modern", "minimalist", "clean", "professional"
✗ Stock-photo people / handshakes / pointing at laptops
✗ Cartoon icons, emoji, clip art
✗ Gradient backgrounds with rainbow colors
✗ Generic motivational typography lockups
✗ Fake dashboard mockups
✗ More than one focal element per slide

Respond with ONLY valid JSON matching the exact schema. No markdown, no code fences.`

const OUTPUT_SCHEMA = `{
  "agent_name": "Carousel Agent",
  "status": "needs_review",
  "summary": "<1-2 sentence summary of the carousel angle>",
  "carousel": {
    "title": "<carousel title for internal reference>",
    "angle": "<the proven angle this carousel uses>",
    "target_reader": "<specific buyer this targets>",
    "business_goal": "<which business outcome this drives>",
    "brand_kit": {
      "primary_hex": "<#RRGGBB>",
      "secondary_hex": "<#RRGGBB>",
      "accent_hex": "<#RRGGBB>",
      "neutral_hex": "<#RRGGBB>",
      "typography_primary": "<font family + weight>",
      "typography_secondary": "<font family + weight>",
      "lighting_signature": "<consistent lighting>",
      "material_vocabulary": ["<m1>", "<m2>"],
      "mood": "<2-3 mood adjectives>"
    },
    "slides": [
      {
        "slide_number": 1,
        "slide_role": "Hook",
        "headline": "<max 12 words>",
        "body": "<max 25 words, can be empty if pure typographic>",
        "image_prompt": "<full 100-180 word prompt following the FORMULA. Includes hex codes, typography, lighting, composition. Renders headline text IN the image when appropriate.>"
      }
    ],
    "caption": "<LinkedIn post caption that goes with the carousel — 150-300 words, engaging hook, no fluff, ends with the CTA>",
    "hashtags": ["<3-5 relevant hashtags>"]
  },
  "recommended_next_action": "<what to do next>",
  "requires_human": true,
  "confidence": 0.0
}`

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const projectId = body.project_id
  const angle = body.angle || null
  const skipGeneration = body.skip_generation === true
  if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 })

  const ctx = await buildProjectContext(projectId, userId)
  if (!ctx) return Response.json({ error: 'Project not found' }, { status: 404 })

  if (!ctx.project.approved_offer) {
    return Response.json({ error: 'Run and approve Product Strategy Agent first.' }, { status: 400 })
  }

  const agent = (await lookupAgent('Carousel Agent')) || (await lookupAgent('Carousel / One-Pager Agent'))
  if (!agent) return Response.json({ error: 'Carousel Agent not found in database.' }, { status: 500 })

  await logActivity({
    user_id: userId, project_id: projectId, agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: `Carousel Agent started for "${ctx.project.name}"`,
  })

  // If project already has a brand kit (from prior Image Prompt Agent run), pass it as a constraint
  const existingBrandKit = (ctx.project as { brand_colors?: Record<string, unknown> }).brand_colors

  const userPrompt = `Create a premium 7-slide LinkedIn carousel for this offer.

${formatApprovedStrategy(ctx.project)}

${angle ? `REQUESTED ANGLE: ${angle}` : `Pick the most effective angle for this offer + audience. Examples: "X mistakes [buyer] makes", "The hidden reason [buyer] is losing [result]", "Before vs after fixing [problem]", "A simple checklist for [buyer]", "How to know if you need [offer]", "The X-part framework to [outcome]".`}

${existingBrandKit ? `EXISTING BRAND KIT (use these EXACT hex codes and typography across all 7 slides):
${JSON.stringify(existingBrandKit, null, 2)}` : `Create a brand kit fitting this specific business. Pick a palette that signals premium B2B (avoid generic blue/white SaaS look unless it truly fits). Use editorial / typographic-led design.`}

Generate exactly 7 slides following the architecture (Hook → Problem → Insight → Framework → Proof → Outcome → CTA).

Each slide's image_prompt must:
- Be 100-180 words
- Use the SAME hex codes and typography across all 7 slides (cohesion is the point)
- Render the slide's headline text IN the image when role is Hook, Framework, Proof, Outcome, or CTA
- Vary composition slightly per slide (centered, full-bleed, left-aligned, split) so the carousel reads as a sequence not a static set
- Include specific materials/textures, lighting direction, and composition

Write a LinkedIn caption (150-300 words) that hooks readers, summarizes the value of the carousel, and ends with the approved offer's CTA.

Respond with ONLY the JSON matching this schema:
${OUTPUT_SCHEMA}`

  try {
    const result = await runAI({
      taskType: 'carousel',
      preferredProvider: 'anthropic',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 6000,
      temperature: 0.85,
    })

    const parsed = tryParseJSON(result.text) as {
      carousel?: {
        title?: string
        slides?: Array<{ slide_number: number; slide_role: string; headline: string; body: string; image_prompt: string }>
        brand_kit?: Record<string, unknown>
        caption?: string
      }
      summary?: string
      confidence?: number
    } | null

    if (!parsed?.carousel?.slides) {
      await logActivity({
        user_id: userId, project_id: projectId, agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'Carousel Agent returned invalid JSON',
      })
      return Response.json({ error: 'AI returned invalid JSON or missing carousel structure.' }, { status: 422 })
    }

    if (parsed.carousel.brand_kit && !existingBrandKit) {
      await supabaseAdmin
        .from('projects')
        .update({ brand_colors: parsed.carousel.brand_kit })
        .eq('id', projectId)
        .eq('user_id', userId)
    }

    let slidesWithImages = parsed.carousel.slides.map(s => ({ ...s, image_url: null as string | null }))
    let generationError: string | null = null

    if (!skipGeneration) {
      try {
        const items = parsed.carousel.slides.map((s, i) => ({
          prompt: s.image_prompt,
          filename: `carousel-slide-${i + 1}-${s.slide_role.toLowerCase()}.png`,
          size: '1024x1024' as const,
        }))

        const generated = await generateImageBatch(
          { userId, projectId, quality: 'high' },
          items,
          2
        )

        slidesWithImages = parsed.carousel.slides.map((s, i) => ({
          ...s,
          image_url: generated[i]?.url || null,
        }))

        for (let i = 0; i < generated.length; i++) {
          const g = generated[i]
          await supabaseAdmin.from('generated_images').insert({
            user_id: userId,
            project_id: projectId,
            url: g.url,
            storage_path: g.path,
            prompt: g.prompt,
            revised_prompt: g.revisedPrompt || null,
            use_case: `carousel_slide_${i + 1}_${parsed.carousel?.slides?.[i]?.slide_role?.toLowerCase()}`,
            size: '1024x1024',
          })
        }
      } catch (e) {
        generationError = e instanceof Error ? e.message : 'Image generation failed'
        await logActivity({
          user_id: userId, project_id: projectId, agent_id: agent.id,
          event_type: 'agent.image_generation_failed',
          event_description: `Carousel image generation failed: ${generationError}`,
        })
      }
    }

    const enrichedOutput = {
      ...parsed,
      carousel: { ...parsed.carousel, slides: slidesWithImages },
      generation_error: generationError,
    }

    const saved = await createAgentMessage({
      userId, projectId, agentId: agent.id, agentName: 'Carousel Agent',
      title: `Carousel: ${parsed.carousel.title || ctx.project.name}`,
      summary: parsed.summary || 'Branded 7-slide LinkedIn carousel generated',
      messageType: 'content',
      outputPayload: enrichedOutput,
      inputPayload: { project_id: projectId, angle },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    })

    return Response.json(saved, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logActivity({
      user_id: userId, project_id: projectId, agent_id: agent.id,
      event_type: 'agent.output_failed',
      event_description: `Carousel Agent failed: ${msg}`,
    })
    return Response.json({ error: `AI API call failed: ${msg}` }, { status: 500 })
  }
}
