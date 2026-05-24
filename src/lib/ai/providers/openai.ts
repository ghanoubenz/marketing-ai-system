import type { RunAIParams, RunAIResult } from '../model-router'

const MODEL = 'gpt-4o'

export async function runOpenAI(params: RunAIParams): Promise<RunAIResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens || 4096,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(`OpenAI API error: ${err.error?.message || res.statusText}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''

  return {
    text,
    provider: 'openai',
    model: MODEL,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  }
}
