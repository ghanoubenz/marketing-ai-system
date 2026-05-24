import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { buildProjectContext, formatApprovedStrategy } from '@/lib/services/project-context'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { logActivity } from '@/lib/services/activity-log'
import { generateImageBatch } from '@/lib/services/image-generator'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SYSTEM_PROMPT = `You are the Visual Director for a top-tier B2B brand studio. You design visuals at the level of Pentagram, Linear, Stripe Press, Loom, and Notion — visuals that look like they cost $20K to commission.

You write image prompts for OpenAI's gpt-image-2 model (released April 21, 2026 — the state-of-the-art image generation model with native reasoning). gpt-image-2 understands natural language exceptionally well and "thinks before it draws." It does NOT need Midjourney-style parameter syntax. It needs PRECISION + ART DIRECTION.

═══════════════════════════════════════════════
THE PROMPT FORMULA (use this exact structure)
═══════════════════════════════════════════════

[SUBJECT/COMPOSITION] + [STYLE & ART REFERENCE] + [LIGHTING & MOOD] + [COLOR PALETTE with hex codes] + [TYPOGRAPHY ZONES] + [TEXTURE & MATERIAL] + [NEGATIVE GUIDANCE inline]

Each prompt must be 80-150 words. Specific. Vivid. Direct.

═══════════════════════════════════════════════
ART DIRECTION RULES (ZERO TOLERANCE)
═══════════════════════════════════════════════

DO write prompts that produce:
✓ Editorial-quality compositions (think NYT op-ed illustrations, Wired feature art, FT Weekend covers)
✓ Specific palette: name 2-4 hex codes (e.g. "#0A2540 deep navy, #FF5C35 warm orange accent, #F6F9FC paper white")
✓ Real materials & textures: brushed metal, frosted glass, matte paper, soft suede, glossy ceramic, anodized aluminum, raw concrete, oxidized copper, raw silk, polished marble
✓ Specific lighting: "single soft northern window light, 45° rake", "studio rim light from camera-left", "golden hour through frosted window"
✓ Composition framing: "centered subject with 30% negative space top, hero text zone bottom-left", "tight 3/4 perspective"
✓ Photographic / 3D rendering style cues: "shot on Phase One IQ4, 80mm lens, f/8" or "cinema 4D render, octane, depth of field"
✓ Mood adjectives that mean something: "quiet confidence", "engineered precision", "analog warmth", "clinical clarity"

DO NOT write prompts containing:
✗ "Modern", "minimalist", "clean", "professional" — these are meaningless filler words
✗ "High quality", "4K", "8K", "ultra realistic" — gpt-image-2 ignores these
✗ "Business meeting", "team collaboration", "handshake", "diverse group of professionals" — instant stock photo
✗ Generic "happy people pointing at laptop" compositions
✗ Random emoji icons, clip art, cartoon mascots
✗ Bright primary colors without deliberate purpose
✗ Fake dashboard screenshots with random data
✗ Multiple competing focal points

═══════════════════════════════════════════════
TEXT-IN-IMAGE RULES
═══════════════════════════════════════════════

gpt-image-2 renders text with high accuracy. When a slide needs text:
- Quote the EXACT text in the prompt: 'centered headline text reading "Your funnel is leaking 40% of revenue" in IBM Plex Sans Bold'
- Specify font family + weight (IBM Plex Sans, Inter, Söhne, Neue Haas Grotesk, Tiempos Headline, GT America)
- Specify alignment + position
- Keep text under 8 words for readability

═══════════════════════════════════════════════
BRAND COHERENCE (CRITICAL)
═══════════════════════════════════════════════

When generating prompts for a carousel or campaign, ALL prompts must share:
- Same color palette (carry hex codes verbatim across all prompts)
- Same typography family
- Same lighting/mood signature
- Same material/texture vocabulary

This produces a cohesive set, not 8 disconnected images.

Respond with ONLY valid JSON matching the exact schema provided. No markdown, no code fences, no explanation outside the JSON.`

const OUTPUT_SCHEMA = `{
  "agent_name": "Image Prompt Agent",
  "status": "needs_review",
  "summary": "<1-2 sentence summary of the visual direction>",
  "brand_kit": {
    "primary_hex": "<#RRGGBB>",
    "secondary_hex": "<#RRGGBB>",
    "accent_hex": "<#RRGGBB>",
    "neutral_hex": "<#RRGGBB>",
    "typography_primary": "<font name + weight, e.g. 'Söhne Halbfett'>",
    "typography_secondary": "<font name + weight>",
    "lighting_signature": "<consistent lighting description used across all images>",
    "material_vocabulary": ["<material 1>", "<material 2>", "<material 3>"],
    "mood": "<2-3 mood adjectives that describe the brand>"
  },
  "image_prompts": [
    {
      "use_case": "<hero_image|linkedin_post|carousel_cover|carousel_slide|service_card|one_pager|ad_visual|brand_texture>",
      "title": "<descriptive title>",
      "prompt": "<full 80-150 word prompt following the FORMULA above. Must include hex codes, materials, lighting, composition.>",
      "size": "<1024x1024|1024x1536|1536x1024|1792x1024|1024x1792>",
      "aspect_ratio": "<1:1|2:3|3:2|7:4|4:7>",
      "placement": "<exactly where this image will be used>",
      "text_overlay_zone": "<which area is reserved for text overlay, or 'none'>"
    }
  ],
  "recommended_next_action": "<what to do with these images>",
  "requires_human": true,
  "confidence": 0.0
}`

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const projectId = body.project_id
  const skipGeneration = body.skip_generation === true
  if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 })

  const ctx = await buildProjectContext(projectId, userId, { includeContent: true })
  if (!ctx) return Response.json({ error: 'Project not found' }, { status: 404 })

  if (!ctx.project.approved_offer) {
    return Response.json({ error: 'Run and approve Product Strategy Agent first.' }, { status: 400 })
  }

  const agent = await lookupAgent('Image Prompt Agent')
  if (!agent) return Response.json({ error: 'Image Prompt Agent not found in database.' }, { status: 500 })

  await logActivity({
    user_id: userId, project_id: projectId, agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: `Image Prompt Agent started for "${ctx.project.name}"`,
  })

  const userPrompt = `Generate a complete branded visual system for this offer's marketing assets.

${formatApprovedStrategy(ctx.project)}

INDUSTRY: ${ctx.project.industry || 'Not specified'}
REGION: ${ctx.project.country_or_region || 'Global'}

Generate exactly 8 image prompts following the FORMULA + ART DIRECTION RULES:

1. Landing page hero (1792x1024, aspect 7:4) — the above-fold visual. Establishes the brand. Hero text overlay zone reserved bottom-left.
2. LinkedIn post: Problem awareness (1024x1024) — visualizes the pain the buyer feels.
3. LinkedIn post: Outcome/proof (1024x1024) — visualizes the result they want.
4. Carousel cover slide (1024x1024) — scroll-stopping. Hook text rendered IN the image.
5. Service card / feature image (1024x1536, aspect 2:3) — for website service section.
6. Direct-response ad creative (1024x1024) — designed to drive clicks.
7. One-pager header (1792x1024, aspect 7:4) — for proposal/PDF cover.
8. Brand texture / pattern tile (1024x1024) — reusable background, no text.

CRITICAL: All 8 prompts must share the SAME brand_kit (same hex codes, same typography, same lighting signature, same materials). This is a cohesive system, not 8 random images.

Pick a brand kit that fits THIS specific business — premium B2B tech vs. industrial vs. consulting vs. agency. No defaults.

Respond with ONLY the JSON matching this schema:
${OUTPUT_SCHEMA}`

  try {
    const result = await runAI({
      taskType: 'image-prompt',
      preferredProvider: 'anthropic',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 4096,
      temperature: 0.8,
    })

    const parsed = tryParseJSON(result.text)
    if (!parsed) {
      await logActivity({
        user_id: userId, project_id: projectId, agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'Image Prompt Agent returned invalid JSON',
      })
      return Response.json({ error: 'AI returned invalid JSON.' }, { status: 422 })
    }

    if (parsed.brand_kit) {
      await supabaseAdmin
        .from('projects')
        .update({ brand_colors: parsed.brand_kit })
        .eq('id', projectId)
        .eq('user_id', userId)
    }

    let generatedImages: Array<{ url: string; prompt: string; use_case: string }> = []
    let generationError: string | null = null

    if (!skipGeneration && Array.isArray(parsed.image_prompts)) {
      try {
        const items = (parsed.image_prompts as Array<{
          prompt: string
          use_case: string
          size?: '1024x1024' | '1024x1536' | '1536x1024' | '1024x1792' | '1792x1024'
          title?: string
        }>).map((p, i) => ({
          prompt: p.prompt,
          filename: `${(p.use_case || 'image').replace(/[^a-z0-9]/gi, '_')}-${i + 1}.png`,
          size: p.size || '1024x1024',
        }))

        const generated = await generateImageBatch(
          { userId, projectId, quality: 'high' },
          items,
          2
        )

        generatedImages = generated.map((g, i) => ({
          url: g.url,
          prompt: g.prompt,
          use_case: (parsed.image_prompts as Array<{ use_case: string }>)[i]?.use_case || 'image',
        }))

        for (let i = 0; i < generated.length; i++) {
          const g = generated[i]
          const meta = (parsed.image_prompts as Array<{ use_case?: string; size?: string; title?: string }>)[i]
          await supabaseAdmin.from('generated_images').insert({
            user_id: userId,
            project_id: projectId,
            url: g.url,
            storage_path: g.path,
            prompt: g.prompt,
            revised_prompt: g.revisedPrompt || null,
            use_case: meta?.use_case || null,
            size: meta?.size || null,
          })
        }
      } catch (e) {
        generationError = e instanceof Error ? e.message : 'Image generation failed'
        await logActivity({
          user_id: userId, project_id: projectId, agent_id: agent.id,
          event_type: 'agent.image_generation_failed',
          event_description: `Image generation failed: ${generationError}`,
        })
      }
    }

    const enrichedOutput = {
      ...parsed,
      generated_images: generatedImages,
      generation_error: generationError,
    }

    const saved = await createAgentMessage({
      userId, projectId, agentId: agent.id, agentName: 'Image Prompt Agent',
      title: `Visual System: ${ctx.project.name}`,
      summary: (parsed.summary as string) || 'Branded visual system generated',
      messageType: 'content',
      outputPayload: enrichedOutput,
      inputPayload: { project_id: projectId },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    })

    return Response.json(saved, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logActivity({
      user_id: userId, project_id: projectId, agent_id: agent.id,
      event_type: 'agent.output_failed',
      event_description: `Image Prompt Agent failed: ${msg}`,
    })
    return Response.json({ error: `AI API call failed: ${msg}` }, { status: 500 })
  }
}
