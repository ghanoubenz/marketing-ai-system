export function tryParseJSON(text: string): Record<string, unknown> | null {
  try { return JSON.parse(text) } catch { /* noop */ }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch { /* noop */ }
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch { /* noop */ }
  }

  return null
}

export function validateRequiredFields(
  data: Record<string, unknown>,
  fields: string[]
): { valid: boolean; missing: string[] } {
  const missing = fields.filter(f => !(f in data) || data[f] === null || data[f] === undefined)
  return { valid: missing.length === 0, missing }
}
