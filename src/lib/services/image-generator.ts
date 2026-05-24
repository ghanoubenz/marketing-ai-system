import { generateImage, type ImageSize, type ImageQuality } from '@/lib/ai/providers/gpt-image'
import { uploadImage, type UploadedImage } from './image-storage'

export interface GenerateAndStoreParams {
  userId: string
  projectId?: string
  prompt: string
  filename: string
  size?: ImageSize
  quality?: ImageQuality
  background?: 'transparent' | 'opaque' | 'auto'
}

export interface GeneratedImageRecord extends UploadedImage {
  prompt: string
  revisedPrompt?: string
}

/**
 * Generate an image with gpt-image-1, upload to Supabase, return the public URL.
 */
export async function generateAndStoreImage(
  params: GenerateAndStoreParams
): Promise<GeneratedImageRecord> {
  const result = await generateImage({
    prompt: params.prompt,
    size: params.size,
    quality: params.quality,
    background: params.background,
  })

  if (!result.images.length) {
    throw new Error('No image returned from gpt-image-1')
  }

  const img = result.images[0]
  const uploaded = await uploadImage({
    userId: params.userId,
    projectId: params.projectId,
    base64: img.base64,
    filename: params.filename,
    contentType: 'image/png',
  })

  return {
    ...uploaded,
    prompt: params.prompt,
    revisedPrompt: img.revisedPrompt,
  }
}

/**
 * Generate a batch of images in parallel (with concurrency limit to respect rate limits).
 */
export async function generateImageBatch(
  baseParams: Omit<GenerateAndStoreParams, 'prompt' | 'filename'>,
  items: Array<{ prompt: string; filename: string; size?: ImageSize }>,
  concurrency = 3
): Promise<GeneratedImageRecord[]> {
  const results: GeneratedImageRecord[] = []
  const errors: Array<{ index: number; error: string }> = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const settled = await Promise.allSettled(
      batch.map(item =>
        generateAndStoreImage({
          ...baseParams,
          prompt: item.prompt,
          filename: item.filename,
          size: item.size || baseParams.size,
        })
      )
    )

    settled.forEach((s, idx) => {
      if (s.status === 'fulfilled') results.push(s.value)
      else errors.push({ index: i + idx, error: s.reason?.message || 'Unknown error' })
    })
  }

  if (errors.length && results.length === 0) {
    throw new Error(`All image generations failed. First error: ${errors[0].error}`)
  }

  return results
}
