import { runAnthropic } from './providers/anthropic'
import { runOpenAI } from './providers/openai'
import { runGemini } from './providers/gemini'

export type AIProvider = 'anthropic' | 'openai' | 'gemini'

export interface RunAIParams {
  taskType: string
  preferredProvider?: AIProvider
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}

export interface RunAIResult {
  text: string
  provider: AIProvider
  model: string
  inputTokens?: number
  outputTokens?: number
}

const PROVIDER_PRIORITY: AIProvider[] = ['anthropic', 'openai', 'gemini']

function getAvailableProvider(preferred?: AIProvider): AIProvider | null {
  if (preferred) {
    if (preferred === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic'
    if (preferred === 'openai' && process.env.OPENAI_API_KEY) return 'openai'
    if (preferred === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini'
  }
  for (const p of PROVIDER_PRIORITY) {
    if (p === 'anthropic' && process.env.ANTHROPIC_API_KEY) return p
    if (p === 'openai' && process.env.OPENAI_API_KEY) return p
    if (p === 'gemini' && process.env.GEMINI_API_KEY) return p
  }
  return null
}

export async function runAI(params: RunAIParams): Promise<RunAIResult> {
  const provider = getAvailableProvider(params.preferredProvider)

  if (!provider) {
    throw new Error('No AI provider configured. Add ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY to .env.local')
  }

  if (provider === 'anthropic') {
    return runAnthropic(params)
  }

  if (provider === 'openai') {
    return runOpenAI(params)
  }

  if (provider === 'gemini') {
    return runGemini(params)
  }

  throw new Error(`Provider ${provider} not yet implemented`)
}
