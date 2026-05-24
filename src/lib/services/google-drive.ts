// Google Drive integration for saving large research outputs
// Uses Google API key or service account for file creation

const FOLDER_NAME = 'AI Growth Desk Research'

interface SaveResearchParams {
  title: string
  content: string
  query: string
  sourcesCount: number
  geminiUsed: boolean
}

export async function saveResearchToDrive(params: SaveResearchParams): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) return null

  // Google Drive API requires OAuth2 for file creation, not just an API key.
  // For now, save to Supabase storage as a fallback.
  // When you add a Google service account, this will use Drive directly.

  try {
    const { supabaseAdmin } = await import('@/lib/supabase/server')

    const BUCKET = 'agent-research'

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    if (!buckets?.find(b => b.name === BUCKET)) {
      await supabaseAdmin.storage.createBucket(BUCKET, { public: false })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeName = params.query.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 50)
    const path = `research/${timestamp}-${safeName}.json`

    const document = {
      title: params.title,
      query: params.query,
      sources_count: params.sourcesCount,
      gemini_used: params.geminiUsed,
      created_at: new Date().toISOString(),
      content: JSON.parse(params.content),
    }

    const buffer = Buffer.from(JSON.stringify(document, null, 2))

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: 'application/json', upsert: true })

    if (error) {
      console.error('Failed to save research to storage:', error.message)
      return null
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    return urlData.publicUrl
  } catch (err) {
    console.error('Drive/storage save failed:', err)
    return null
  }
}

// Future: When Google service account is configured, this will use Drive API
// Set GOOGLE_SERVICE_ACCOUNT_JSON in .env.local with the service account JSON
export async function saveToGoogleDrive(
  title: string,
  content: string,
  mimeType = 'application/json'
): Promise<string | null> {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) return null

  try {
    const serviceAccount = JSON.parse(serviceAccountJson)

    // Create JWT for service account auth
    const jwt = await createServiceAccountJWT(serviceAccount)
    const accessToken = await exchangeJWTForToken(jwt)

    // Create file in Drive
    const metadata = {
      name: title,
      mimeType,
      parents: [await getOrCreateFolder(accessToken, FOLDER_NAME)],
    }

    const boundary = '---research-boundary---'
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      `Content-Type: ${mimeType}`,
      '',
      content,
      `--${boundary}--`,
    ].join('\r\n')

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    })

    if (!res.ok) return null

    const file = await res.json()
    return `https://drive.google.com/file/d/${file.id}/view`
  } catch {
    return null
  }
}

async function createServiceAccountJWT(sa: { client_email: string; private_key: string }): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))

  // In Node.js, use crypto to sign
  const { createSign } = await import('crypto')
  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const signature = sign.sign(sa.private_key, 'base64url')

  return `${header}.${payload}.${signature}`
}

async function exchangeJWTForToken(jwt: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  return data.access_token
}

async function getOrCreateFolder(accessToken: string, folderName: string): Promise<string> {
  // Search for existing folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const searchData = await searchRes.json()
  if (searchData.files?.length > 0) return searchData.files[0].id

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })
  const folder = await createRes.json()
  return folder.id
}
