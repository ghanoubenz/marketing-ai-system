import { supabaseAdmin } from '@/lib/supabase/server'

const BUCKET = 'agent-images'
let bucketVerified = false

async function ensureBucket() {
  if (bucketVerified) return
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
  if (error && !error.message.includes('already exists')) throw error
  bucketVerified = true
}

export interface UploadImageParams {
  userId: string
  projectId?: string
  base64: string
  filename: string
  contentType?: string
}

export interface UploadedImage {
  url: string
  path: string
}

/**
 * Upload a base64-encoded image to the agent-images Supabase bucket.
 * Returns the public URL.
 */
export async function uploadImage(params: UploadImageParams): Promise<UploadedImage> {
  const { userId, projectId, base64, filename, contentType = 'image/png' } = params

  await ensureBucket()

  const buffer = Buffer.from(base64, 'base64')
  const folder = projectId ? `${userId}/${projectId}` : userId
  const path = `${folder}/${Date.now()}-${filename}`

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(path)

  return {
    url: publicUrlData.publicUrl,
    path,
  }
}

export async function uploadMultipleImages(
  baseParams: Omit<UploadImageParams, 'base64' | 'filename'>,
  images: Array<{ base64: string; filename: string }>
): Promise<UploadedImage[]> {
  const results: UploadedImage[] = []
  for (const img of images) {
    const result = await uploadImage({ ...baseParams, ...img })
    results.push(result)
  }
  return results
}
