import Anthropic from '@anthropic-ai/sdk'
import type { RunAIParams, RunAIResult } from '../model-router'

const MODEL = 'claude-sonnet-4-20250514'

export async function runAnthropic(params: RunAIParams): Promise<RunAIResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens || 4096,
    system: params.systemPrompt,
    messages: [{ role: 'user', content: params.userPrompt }],
  })

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from AI')
  }

  return {
    text: textBlock.text,
    provider: 'anthropic',
    model: MODEL,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  }
}
