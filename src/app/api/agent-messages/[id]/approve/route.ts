import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-log'
import { generateImage } from '@/lib/ai/providers/gpt-image'
import { onMessageApproved } from '@/lib/services/agent-pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const { id } = await params

  // Fetch message
  const { data: message, error: fetchError } = await supabaseAdmin
    .from('agent_messages')
    .select('*, agent:agents(id, name), project:projects(id, name)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (fetchError || !message) return Response.json({ error: 'Message not found' }, { status: 404 })

  // Update message status
  const { error: updateError } = await supabaseAdmin
    .from('agent_messages')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

  // If this is a Product Strategy Agent output, update project approved fields
  if (message.message_type === 'strategy' && message.project_id && message.output_payload) {
    const output = message.output_payload as Record<string, unknown>
    const projectUpdate: Record<string, unknown> = {}

    if (output.one_line_offer) projectUpdate.approved_offer = output.one_line_offer
    if (output.positioning) projectUpdate.approved_positioning = output.positioning
    if (output.target_customer) projectUpdate.approved_icp = output.target_customer
    if (output.pricing) projectUpdate.approved_pricing = output.pricing
    if (output.landing_page_angle) {
      const lpa = output.landing_page_angle as Record<string, string>
      projectUpdate.approved_cta = lpa.primary_cta || null
    }

    // Build memory summary from key outputs
    const summaryParts = []
    if (output.one_line_offer) summaryParts.push(`Offer: ${output.one_line_offer}`)
    if (output.summary) summaryParts.push(`Strategy: ${output.summary}`)
    if (summaryParts.length) projectUpdate.project_memory_summary = summaryParts.join('\n')

    if (Object.keys(projectUpdate).length > 0) {
      const { error: projError } = await supabaseAdmin
        .from('projects')
        .update(projectUpdate)
        .eq('id', message.project_id)
        .eq('user_id', userId)

      if (projError) {
        console.error('Failed to update project approved fields:', projError.message)
      } else {
        await logActivity({
          user_id: userId,
          project_id: message.project_id,
          event_type: 'project.offer_updated',
          event_description: 'Project approved fields updated from Product Strategy Agent output',
          metadata: { updated_fields: Object.keys(projectUpdate) },
        })
      }
    }
  }

  // Save content agent outputs to content_assets
  const agentName = (message.agent as { id: string; name: string } | undefined)?.name || ''
  const projectName = (message.project as { id: string; name: string } | undefined)?.name || 'Untitled'

  if (message.message_type === 'content' && message.project_id && message.output_payload) {
    const output = message.output_payload as Record<string, unknown>

    const contentInserts: Array<{
      content_type: string; title: string; body: string; cta: string | null
    }> = []

    if (agentName === 'Landing Page Agent') {
      const hero = output.hero as Record<string, string> | undefined
      contentInserts.push({
        content_type: 'landing_page_section',
        title: `Landing Page: ${projectName}`,
        body: JSON.stringify(output),
        cta: hero?.primary_cta || null,
      })
    } else if (agentName === 'Content Agent') {
      contentInserts.push({
        content_type: 'linkedin_post',
        title: `LinkedIn Content: ${projectName}`,
        body: JSON.stringify(output),
        cta: null,
      })
    } else if (agentName === 'Image Prompt Agent') {
      contentInserts.push({
        content_type: 'image_prompt',
        title: `Image Prompts: ${projectName}`,
        body: JSON.stringify(output),
        cta: null,
      })
    }

    for (const item of contentInserts) {
      const { error: contentError } = await supabaseAdmin
        .from('content_assets')
        .insert({
          user_id: userId,
          project_id: message.project_id,
          agent_id: message.agent_id,
          ...item,
          status: 'approved',
        })

      if (contentError) {
        console.error('Failed to save content asset:', contentError.message)
      } else {
        await logActivity({
          user_id: userId,
          project_id: message.project_id,
          agent_id: message.agent_id,
          event_type: 'content.created',
          event_description: `${agentName} output saved as content asset`,
          metadata: { message_id: id, content_type: item.content_type },
        })
      }
    }
  }

  // Save outreach agent outputs to outreach_messages
  if (message.message_type === 'outreach' && agentName === 'Outreach Agent' && message.project_id && message.output_payload) {
    const output = message.output_payload as Record<string, unknown>
    const sequence = output.outreach_sequence as Array<Record<string, unknown>> | undefined

    if (sequence && sequence.length > 0) {
      for (const msg of sequence) {
        await supabaseAdmin.from('outreach_messages').insert({
          user_id: userId,
          project_id: message.project_id,
          channel: msg.channel || 'email',
          sequence_step: msg.sequence_step || 1,
          subject: msg.subject || null,
          body: (msg.body as string) || '',
          status: 'approved',
        })
      }

      await logActivity({
        user_id: userId,
        project_id: message.project_id,
        agent_id: message.agent_id,
        event_type: 'outreach.created',
        event_description: `${sequence.length} outreach messages saved`,
        metadata: { message_id: id, count: sequence.length },
      })
    }
  }

  // Save proposal outputs to proposals table
  if (message.message_type === 'proposal' && message.project_id && message.output_payload) {
    const output = message.output_payload as Record<string, unknown>
    const proposal = output.proposal as Record<string, unknown> | undefined
    const input = (message.input_payload as Record<string, unknown>) || {}

    if (proposal) {
      const { error: propError } = await supabaseAdmin.from('proposals').insert({
        user_id: userId,
        project_id: message.project_id,
        lead_id: (input.lead_id as string) || null,
        title: (proposal.title as string) || 'Untitled Proposal',
        scope: JSON.stringify(proposal.scope_of_work || []),
        price: JSON.stringify(proposal.pricing_tiers || []),
        timeline: (proposal.timeline_overview as string) || null,
        body: JSON.stringify(proposal),
        status: 'approved',
      })

      if (!propError) {
        await logActivity({
          user_id: userId,
          project_id: message.project_id,
          agent_id: message.agent_id,
          event_type: 'proposal.created',
          event_description: `Proposal saved: ${proposal.title}`,
          metadata: { message_id: id },
        })
      }
    }
  }

  // Save lead research ICP + search strategy to project memory
  if (message.message_type === 'lead_research' && message.project_id && message.output_payload) {
    const output = message.output_payload as Record<string, unknown>
    const icp = output.ideal_customer_profile as Record<string, unknown> | undefined
    const apolloFilters = output.apollo_filters as Record<string, unknown> | undefined
    const painMap = output.pain_map as Array<Record<string, unknown>> | undefined

    const memoryParts: string[] = []
    if (icp) {
      memoryParts.push(`ICP: ${(icp.industries_apollo as string[])?.join(', ') || 'See research'} | ${icp.employee_count_min}-${icp.employee_count_max} employees | ${icp.revenue_band || ''}`)
      if (icp.buying_signals) memoryParts.push(`Buying signals: ${(icp.buying_signals as string[]).join(', ')}`)
    }
    if (apolloFilters?.ready_to_paste_query_string) {
      memoryParts.push(`Apollo query: ${apolloFilters.ready_to_paste_query_string}`)
    }
    if (painMap && painMap.length > 0) {
      memoryParts.push(`Champion pain: ${painMap[0].core_pain || ''}`)
    }

    if (memoryParts.length > 0) {
      const { data: currentProject } = await supabaseAdmin
        .from('projects')
        .select('project_memory_summary')
        .eq('id', message.project_id)
        .single()

      const existingMemory = (currentProject?.project_memory_summary as string) || ''
      const newMemory = existingMemory
        ? `${existingMemory}\n\nLEAD RESEARCH:\n${memoryParts.join('\n')}`
        : `LEAD RESEARCH:\n${memoryParts.join('\n')}`

      await supabaseAdmin
        .from('projects')
        .update({ project_memory_summary: newMemory })
        .eq('id', message.project_id)
        .eq('user_id', userId)

      await logActivity({
        user_id: userId,
        project_id: message.project_id,
        agent_id: message.agent_id,
        event_type: 'project.research_saved',
        event_description: 'Lead research ICP & search strategy saved to project memory',
        metadata: { message_id: id },
      })
    }
  }

  // Carousel Design — generate all slide images on approval, save to one folder
  if (agentName === 'Carousel Design Agent' && message.output_payload) {
    const output = message.output_payload as Record<string, unknown>
    const slides = (output.slides as Array<Record<string, unknown>>) || []

    if (slides.length > 0) {
      const BUCKET = 'agent-images'
      const safeName = projectName.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase()
      const folder = `${userId}/${message.project_id || 'general'}/carousel-${safeName}-${id.slice(0, 8)}`

      const imageResults: Array<{ slide_number: number; url: string; error?: string }> = []

      for (const slide of slides) {
        const prompt = slide.image_prompt as string
        const slideNum = slide.slide_number as number
        if (!prompt) { imageResults.push({ slide_number: slideNum, url: '', error: 'No prompt' }); continue }

        try {
          const genResult = await generateImage({ prompt, size: '1024x1536', quality: 'high' })
          if (!genResult.images.length) { imageResults.push({ slide_number: slideNum, url: '', error: 'No image' }); continue }

          const buffer = Buffer.from(genResult.images[0].base64, 'base64')
          const path = `${folder}/slide-${String(slideNum).padStart(2, '0')}.png`
          const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, { contentType: 'image/png', upsert: true })
          if (upErr) { imageResults.push({ slide_number: slideNum, url: '', error: upErr.message }); continue }

          const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
          imageResults.push({ slide_number: slideNum, url: urlData.publicUrl })
        } catch (err) {
          imageResults.push({ slide_number: slideNum, url: '', error: err instanceof Error ? err.message : 'Failed' })
        }
      }

      const updatedSlides = slides.map(s => {
        const r = imageResults.find(r => r.slide_number === s.slide_number)
        if (r?.url) return { ...s, generated_image_url: r.url }
        return s
      })

      await supabaseAdmin.from('agent_messages').update({
        output_payload: {
          ...output,
          slides: updatedSlides,
          image_folder: folder,
          generated_images: imageResults.filter(r => r.url).map(r => ({ slide_number: r.slide_number, url: r.url })),
          images_generated_at: new Date().toISOString(),
        },
      }).eq('id', id)

      const successCount = imageResults.filter(r => r.url).length
      await logActivity({
        user_id: userId, project_id: message.project_id, agent_id: message.agent_id,
        event_type: 'carousel.images_generated',
        event_description: `${successCount}/${slides.length} carousel images saved to ${folder}`,
        metadata: { message_id: id, folder },
      })
    }
  }

  await logActivity({
    user_id: userId,
    project_id: message.project_id,
    agent_id: message.agent_id,
    event_type: 'agent.message_approved',
    event_description: `Approved: ${message.title}`,
    metadata: { message_id: id, message_type: message.message_type },
  })

  // Pipeline: auto-trigger downstream agents when this message is approved
  let pipelineResult: { triggered: string[]; errors: string[] } = { triggered: [], errors: [] }
  try {
    pipelineResult = await onMessageApproved(id, userId)
  } catch (err) {
    console.error('Pipeline trigger failed:', err)
  }

  return Response.json({
    success: true,
    status: 'approved',
    pipeline: pipelineResult.triggered.length > 0
      ? { triggered: pipelineResult.triggered, errors: pipelineResult.errors }
      : undefined,
  })
}
