import type { RunAIParams, RunAIResult } from '../model-router'

const MODEL = 'gemini-2.5-flash'

export async function runGemini(params: RunAIParams): Promise<RunAIResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${params.systemPrompt}\n\n${params.userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxTokens || 8192,
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(`Gemini API error: ${err.error?.message || res.statusText}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  return {
    text,
    provider: 'gemini',
    model: MODEL,
    inputTokens: data.usageMetadata?.promptTokenCount,
    outputTokens: data.usageMetadata?.candidatesTokenCount,
  }
}

// Gemini deep search — uses grounding with Google Search for real-time data
export async function runGeminiDeepSearch(query: string): Promise<{
  answer: string
  sources: Array<{ title: string; url: string; snippet: string }>
}> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are a B2B marketing research expert. Search for the latest, most actionable information on this topic and provide specific frameworks, numbers, and tactics.

RESEARCH TOPIC: ${query}

Provide your answer with:
1. Key findings with specific numbers and benchmarks
2. Named frameworks or methods from real experts
3. Actionable tactics that can be used immediately
4. Sources you found

Be specific — no generic advice. Include real names, real numbers, real frameworks.`,
              },
            ],
          },
        ],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(`Gemini Deep Search error: ${err.error?.message || res.statusText}`)
  }

  const data = await res.json()
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Extract grounding sources if available
  const groundingMetadata = data.candidates?.[0]?.groundingMetadata
  const sources: Array<{ title: string; url: string; snippet: string }> = []

  if (groundingMetadata?.groundingChunks) {
    for (const chunk of groundingMetadata.groundingChunks) {
      if (chunk.web) {
        sources.push({
          title: chunk.web.title || '',
          url: chunk.web.uri || '',
          snippet: '',
        })
      }
    }
  }

  if (groundingMetadata?.webSearchQueries) {
    // Keep track of search queries used
  }

  return { answer, sources }
}
