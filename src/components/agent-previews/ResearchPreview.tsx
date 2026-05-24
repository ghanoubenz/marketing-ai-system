'use client'

import React from 'react'

interface Source {
  title: string
  url: string
  type: string
  author?: string
  key_insight: string
  specific_tactics?: string[]
  numbers_or_benchmarks?: string[]
  applicability?: string
}

interface ResearchData {
  research_query?: string
  search_queries_used?: string[]
  sources?: Source[]
  synthesized_knowledge?: {
    topic?: string
    category?: string
    key_takeaways?: string[]
    frameworks_found?: string[]
    templates_or_formulas?: string[]
    applicable_agents?: string[]
    confidence?: number
  }
  recommendations?: {
    immediate_actions?: string[]
    agents_to_retrigger?: string[]
    gaps_remaining?: string[]
  }
}

export default function ResearchPreview({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as ResearchData

  return (
    <div className="space-y-5 text-sm">
      {d.research_query && (
        <div className="bg-indigo-50 rounded-lg p-4">
          <h3 className="font-semibold text-indigo-900 mb-1">Research Query</h3>
          <p className="text-indigo-800">{d.research_query}</p>
        </div>
      )}

      {d.synthesized_knowledge?.key_takeaways && d.synthesized_knowledge.key_takeaways.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            Key Takeaways
            {d.synthesized_knowledge.category && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{d.synthesized_knowledge.category}</span>
            )}
          </h3>
          <ul className="space-y-1.5">
            {d.synthesized_knowledge.key_takeaways.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5 font-bold">✓</span>
                <span className="text-gray-700">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.synthesized_knowledge?.frameworks_found && d.synthesized_knowledge.frameworks_found.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Frameworks Found</h3>
          <div className="grid gap-2">
            {d.synthesized_knowledge.frameworks_found.map((f, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-gray-700">{f}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.synthesized_knowledge?.templates_or_formulas && d.synthesized_knowledge.templates_or_formulas.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Templates & Formulas</h3>
          <div className="space-y-2">
            {d.synthesized_knowledge.templates_or_formulas.map((t, i) => (
              <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-gray-700 font-mono text-xs">{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.sources && d.sources.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Sources ({d.sources.length})</h3>
          <div className="space-y-3">
            {d.sources.map((s, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                    {s.type === 'youtube' ? '▶️' : '🔗'} {s.type}
                  </span>
                  <span className="font-medium text-gray-900 text-xs">{s.title}</span>
                </div>
                {s.author && <p className="text-xs text-gray-500 mb-1">by {s.author}</p>}
                <p className="text-gray-700 mb-2">{s.key_insight}</p>
                {s.specific_tactics && s.specific_tactics.length > 0 && (
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {s.specific_tactics.map((t, j) => (
                      <li key={j}>• {t}</li>
                    ))}
                  </ul>
                )}
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                    View source →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {d.recommendations && (
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">Recommendations</h3>
          {d.recommendations.immediate_actions && d.recommendations.immediate_actions.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-green-700 uppercase mb-1">Do Now</h4>
              <ul className="space-y-1">
                {d.recommendations.immediate_actions.map((a, i) => (
                  <li key={i} className="text-green-800 text-sm">→ {a}</li>
                ))}
              </ul>
            </div>
          )}
          {d.recommendations.agents_to_retrigger && d.recommendations.agents_to_retrigger.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-semibold text-green-700 uppercase mb-1">Re-run These Agents</h4>
              <div className="flex gap-1 flex-wrap">
                {d.recommendations.agents_to_retrigger.map((a, i) => (
                  <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{a}</span>
                ))}
              </div>
            </div>
          )}
          {d.recommendations.gaps_remaining && d.recommendations.gaps_remaining.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-700 uppercase mb-1">Still Needs Research</h4>
              <ul className="space-y-1">
                {d.recommendations.gaps_remaining.map((g, i) => (
                  <li key={i} className="text-green-800 text-sm">? {g}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {d.synthesized_knowledge?.applicable_agents && d.synthesized_knowledge.applicable_agents.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">Applies to:</span>
          {d.synthesized_knowledge.applicable_agents.map((a, i) => (
            <span key={i} className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{a}</span>
          ))}
        </div>
      )}
    </div>
  )
}
