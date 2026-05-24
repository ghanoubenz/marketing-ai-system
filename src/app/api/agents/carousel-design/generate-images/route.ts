import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-log'
import { generateImage } from '@/lib/ai/providers/gpt-image'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BUCKET = 'agent-images'

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const messageId = body.message_id
  if (!messageId) return Response.json({ error: 'message_id is required' }, { status: 400 })

  const { data: message, error: msgErr } = await supabaseAdmin
    .from('agent_messages')
    .select('*, project:projects(id, name)')
    .eq('id', messageId)
    .eq('user_id', userId)
    .single()

  if (msgErr || !message) return Response.json({ error: 'Message not found' }, { status: 404 })

  const output = message.output_payload as Record<string, unknown>
  const slides = (output.slides as Array<Record<string, unknown>>) || []

  if (!slides.length) return Response.json({ error: 'No slides found' }, { status: 400 })

  const projectName = (message.project as { name: string } | undefined)?.name || 'carousel'
  const safeName = projectName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase()
  const folder = `${userId}/${message.project_id || 'general'}/carousel-${safeName}-${messageId.slice(0, 8)}`

  await logActivity({
    user_id: userId,
    project_id: message.project_id,
    event_type: 'carousel.image_generation_started',
    event_description: `Generating ${slides.length} carousel images`,
    metadata: { message_id: messageId, folder },
  })

  const results: Array<{ slide_number: number; url: string; path: string; error?: string }> = []

  for (const slide of slides) {
    const prompt = slide.image_prompt as string
    const slideNum = slide.slide_number as number

    if (!prompt) {
      results.push({ slide_number: slideNum, url: '', path: '', error: 'No prompt' })
      continue
    }

    try {
      const genResult = await generateImage({
        prompt,
        size: '1024x1536',
        quality: 'high',
      })

      if (!genResult.images.length) {
        results.push({ slide_number: slideNum, url: '', path: '', error: 'No image returned' })
        continue
      }

      const buffer = Buffer.from(genResult.images[0].base64, 'base64')
      const filename = `slide-${String(slideNum).padStart(2, '0')}.png`
      const path = `${folder}/${filename}`

      const { error: uploadErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType: 'image/png', upsert: true })

      if (uploadErr) {
        results.push({ slide_number: slideNum, url: '', path: '', error: uploadErr.message })
        continue
      }

      const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
      results.push({ slide_number: slideNum, url: urlData.publicUrl, path })
    } catch (err) {
      results.push({ slide_number: slideNum, url: '', path: '', error: err instanceof Error ? err.message : 'Failed' })
    }
  }

  // Update slides with generated image URLs
  const updatedSlides = slides.map(s => {
    const r = results.find(r => r.slide_number === s.slide_number)
    if (r?.url) return { ...s, generated_image_url: r.url }
    return s
  })

  await supabaseAdmin
    .from('agent_messages')
    .update({
      output_payload: {
        ...output,
        slides: updatedSlides,
        image_folder: folder,
        generated_images: results.filter(r => r.url).map(r => ({ slide_number: r.slide_number, url: r.url })),
        images_generated_at: new Date().toISOString(),
      },
    })
    .eq('id', messageId)

  const successCount = results.filter(r => r.url).length
  await logActivity({
    user_id: userId,
    project_id: message.project_id,
    event_type: 'carousel.images_generated',
    event_description: `${successCount}/${slides.length} carousel images saved to ${folder}`,
    metadata: { message_id: messageId, folder, results },
  })

  return Response.json({
    success: true,
    generated: successCount,
    total: slides.length,
    folder,
    images: results.filter(r => r.url),
    errors: results.filter(r => r.error),
  })
}
