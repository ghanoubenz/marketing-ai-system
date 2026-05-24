'use client'

const SKIP_KEYS = new Set(['agent_name', 'status', 'confidence', 'requires_human', 'human_approval_needed', 'recommended_next_action', 'recommended_next_actions'])

export default function GenericPreview({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-3 text-sm">
      {Object.entries(data)
        .filter(([k]) => !SKIP_KEYS.has(k))
        .map(([key, value]) => (
          <RenderField key={key} label={formatLabel(key)} value={value} depth={0} />
        ))}
    </div>
  )
}

function RenderField({ label, value, depth }: { label: string; value: unknown; depth: number }) {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'string') {
    return (
      <div className={depth > 0 ? 'mb-1' : 'mb-2'}>
        <span className="text-xs font-medium text-gray-500">{label}: </span>
        <span className="text-sm text-gray-800">{value}</span>
      </div>
    )
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return (
      <div className="mb-1">
        <span className="text-xs font-medium text-gray-500">{label}: </span>
        <span className="text-sm text-gray-800">{String(value)}</span>
      </div>
    )
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null
    if (typeof value[0] === 'string') {
      return (
        <div className="mb-2">
          <span className="text-xs font-medium text-gray-500">{label}: </span>
          <span className="text-sm text-gray-800">{value.join(', ')}</span>
        </div>
      )
    }
    return (
      <div className={`${depth === 0 ? 'border border-gray-200 rounded-lg p-3' : 'pl-3 border-l-2 border-gray-100'} mb-2`}>
        {depth === 0 && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</h4>}
        {depth > 0 && <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>}
        {value.map((item, i) => {
          if (typeof item === 'object' && item !== null) {
            return (
              <div key={i} className="mb-2 p-2 bg-gray-50 rounded">
                {Object.entries(item as Record<string, unknown>).map(([k, v]) => (
                  <RenderField key={k} label={formatLabel(k)} value={v} depth={depth + 1} />
                ))}
              </div>
            )
          }
          return <p key={i} className="text-sm text-gray-800 mb-1">• {String(item)}</p>
        })}
      </div>
    )
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return (
      <div className={`${depth === 0 ? 'border border-gray-200 rounded-lg p-3' : 'pl-3 border-l-2 border-gray-100'} mb-2`}>
        {depth === 0 && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</h4>}
        {depth > 0 && <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>}
        {Object.entries(obj).map(([k, v]) => (
          <RenderField key={k} label={formatLabel(k)} value={v} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return null
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
}
