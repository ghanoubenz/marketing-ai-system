/**
 * GPT Image 2 provider — OpenAI's state-of-the-art image generation model.
 * Released April 21, 2026. Model ID: gpt-image-2 (snapshot: gpt-image-2-2026-04-21).
 *
 * Capabilities:
 *  - Native reasoning ("thinks before it draws")
 *  - Up to 2K resolution (2560x1440)
 *  - Aspect ratios from 3:1 to 1:3
 *  - Up to 8 coherent images per prompt with character/object continuity
 *  - PNG / JPEG / WebP output
 *
 * Endpoint: POST https://api.openai.com/v1/images/generations
 */

export type ImageSize =
  | '1024x1024'
  | '1024x1536'
  | '1536x1024'
  | '1024x1792'
  | '1792x1024'
  | '2048x2048'
  | '2560x1440'
  | '1440x2560'
  | 'auto'

export type ImageQuality = 'low' | 'medium' | 'high' | 'auto'
export type ImageBackground = 'transparent' | 'opaque' | 'auto'
export type ImageOutputFormat = 'png' | 'jpeg' | 'webp'

export interface GenerateImageParams {
  prompt: string
  size?: ImageSize
  quality?: ImageQuality
  background?: ImageBackground
  outputFormat?: ImageOutputFormat
  outputCompression?: number // 0-100, only for jpeg/webp
  n?: number // 1-8
}

export interface GeneratedImage {
  base64: string
  revisedPrompt?: string
}

export interface GenerateImageResult {
  images: GeneratedImage[]
  model: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
}

const MODEL = 'gpt-image-2'

export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const body: Record<string, unknown> = {
    model: MODEL,
    prompt: params.prompt,
    size: params.size || '1024x1024',
    quality: params.quality || 'high',
    n: params.n || 1,
  }

  if (params.background) body.background = params.background
  if (params.outputFormat) body.output_format = params.outputFormat
  if (typeof params.outputCompression === 'number') body.output_compression = params.outputCompression

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    const msg = err.error?.message || res.statusText
    if (msg.includes('verified') || msg.includes('verification')) {
      throw new Error(
        `gpt-image-2 requires a verified OpenAI organization. Visit https://platform.openai.com/settings/organization/general to verify. (${msg})`
      )
    }
    throw new Error(`Image generation failed: ${msg}`)
  }

  const data = await res.json()
  const images: GeneratedImage[] = (data.data || []).map((d: { b64_json: string; revised_prompt?: string }) => ({
    base64: d.b64_json,
    revisedPrompt: d.revised_prompt,
  }))

  return {
    images,
    model: MODEL,
    usage: data.usage
      ? {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  }
}
