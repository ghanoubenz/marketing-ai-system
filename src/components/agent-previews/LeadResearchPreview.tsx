'use client'

import { Target, Search, Users, AlertTriangle, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface PainMapEntry {
  persona: string
  title: string
  core_pain: string
  live_signal: string
  outreach_angle: string
}

interface ScoringCriterion {
  criterion: string
  weight_points: number
  how_to_check: string
}

interface LeadResearchData {
  ideal_customer_profile?: {
    industries_apollo?: string[]
    employee_count_min?: number
    employee_count_max?: number
    revenue_band?: string
    geography?: string
    tech_stack_required?: string[]
    tech_stack_excluded?: string[]
    buying_signals?: string[]
    disqualifiers?: string[]
  }
  decision_makers?: {
    champion_titles?: string[]
    economic_buyer_titles?: string[]
    blocker_titles?: string[]
  }
  apollo_filters?: {
    person_titles?: string[]
    person_seniorities?: string[]
    organization_industries?: string[]
    organization_num_employees_ranges?: string[]
    technologies?: string[]
    ready_to_paste_query_string?: string
  }
  linkedin_sales_nav?: {
    boolean_queries?: string[]
    filter_recipe?: string
  }
  qualification_rubric?: {
    scoring_criteria?: ScoringCriterion[]
    hot_threshold?: number
    warm_threshold?: number
    skip_threshold?: number
  }
  pain_map?: PainMapEntry[]
  recommended_next_action?: string
}

export default function LeadResearchPreview({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as LeadResearchData
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyText = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const CopyBtn = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyText(text, field)}
      className="ml-2 text-gray-400 hover:text-blue-600 inline-flex items-center"
      title="Copy to clipboard"
    >
      {copiedField === field ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
    </button>
  )

  const icp = d.ideal_customer_profile
  const dm = d.decision_makers
  const apollo = d.apollo_filters
  const linkedin = d.linkedin_sales_nav
  const rubric = d.qualification_rubric
  const painMap = d.pain_map

  return (
    <div className="space-y-4">
      {/* ICP */}
      {icp && (
        <div className="border border-blue-200 rounded-lg overflow-hidden">
          <div className="p-3 bg-blue-50">
            <span className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <Target className="w-4 h-4" /> Ideal Customer Profile
            </span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-3 text-xs">
            {icp.industries_apollo?.length && (
              <div><span className="text-gray-400 uppercase text-[10px]">Industries</span>
                <div className="flex flex-wrap gap-1 mt-1">{icp.industries_apollo.map((i, idx) => <span key={idx} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{i}</span>)}</div>
              </div>
            )}
            {(icp.employee_count_min || icp.employee_count_max) && (
              <div><span className="text-gray-400 uppercase text-[10px]">Company Size</span><p className="text-gray-700 mt-1">{icp.employee_count_min}-{icp.employee_count_max} employees</p></div>
            )}
            {icp.revenue_band && <div><span className="text-gray-400 uppercase text-[10px]">Revenue</span><p className="text-gray-700 mt-1">{icp.revenue_band}</p></div>}
            {icp.geography && <div><span className="text-gray-400 uppercase text-[10px]">Geography</span><p className="text-gray-700 mt-1">{icp.geography}</p></div>}
            {icp.tech_stack_required?.length && (
              <div><span className="text-gray-400 uppercase text-[10px]">Must Use</span>
                <div className="flex flex-wrap gap-1 mt-1">{icp.tech_stack_required.map((t, idx) => <span key={idx} className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded">{t}</span>)}</div>
              </div>
            )}
            {icp.tech_stack_excluded?.length && (
              <div><span className="text-gray-400 uppercase text-[10px]">Exclude If Using</span>
                <div className="flex flex-wrap gap-1 mt-1">{icp.tech_stack_excluded.map((t, idx) => <span key={idx} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded">{t}</span>)}</div>
              </div>
            )}
            {icp.buying_signals?.length && (
              <div className="col-span-2"><span className="text-gray-400 uppercase text-[10px]">Buying Signals</span>
                <ul className="mt-1 text-gray-700 space-y-0.5">{icp.buying_signals.map((s, idx) => <li key={idx} className="flex items-start gap-1"><span className="text-green-500 mt-0.5">●</span>{s}</li>)}</ul>
              </div>
            )}
            {icp.disqualifiers?.length && (
              <div className="col-span-2"><span className="text-gray-400 uppercase text-[10px]">Disqualifiers</span>
                <ul className="mt-1 text-red-600 space-y-0.5">{icp.disqualifiers.map((d, idx) => <li key={idx}>✕ {d}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Makers */}
      {dm && (
        <div className="border border-indigo-200 rounded-lg overflow-hidden">
          <div className="p-3 bg-indigo-50">
            <span className="flex items-center gap-2 text-sm font-semibold text-indigo-800">
              <Users className="w-4 h-4" /> Decision Makers
            </span>
          </div>
          <div className="p-3 space-y-2 text-xs">
            {dm.champion_titles?.length && (
              <div><span className="text-green-600 font-medium">Champions:</span> {dm.champion_titles.join(', ')}</div>
            )}
            {dm.economic_buyer_titles?.length && (
              <div><span className="text-blue-600 font-medium">Economic Buyers:</span> {dm.economic_buyer_titles.join(', ')}</div>
            )}
            {dm.blocker_titles?.length && (
              <div><span className="text-red-600 font-medium">Blockers:</span> {dm.blocker_titles.join(', ')}</div>
            )}
          </div>
        </div>
      )}

      {/* Apollo Filters — copy-paste ready */}
      {apollo && (
        <div className="border border-orange-200 rounded-lg overflow-hidden">
          <div className="p-3 bg-orange-50">
            <span className="flex items-center gap-2 text-sm font-semibold text-orange-800">
              <Search className="w-4 h-4" /> Apollo Search Filters
            </span>
          </div>
          <div className="p-3 space-y-2 text-xs">
            {apollo.person_titles?.length && (
              <div>
                <span className="text-gray-400 uppercase text-[10px]">Job Titles</span>
                <CopyBtn text={apollo.person_titles.join(', ')} field="apollo-titles" />
                <p className="text-gray-700 mt-0.5 font-mono bg-gray-50 p-1.5 rounded">{apollo.person_titles.join(' OR ')}</p>
              </div>
            )}
            {apollo.organization_industries?.length && (
              <div>
                <span className="text-gray-400 uppercase text-[10px]">Industries</span>
                <CopyBtn text={apollo.organization_industries.join(', ')} field="apollo-industries" />
                <p className="text-gray-700 mt-0.5">{apollo.organization_industries.join(', ')}</p>
              </div>
            )}
            {apollo.organization_num_employees_ranges?.length && (
              <div><span className="text-gray-400 uppercase text-[10px]">Employee Ranges</span><p className="text-gray-700 mt-0.5">{apollo.organization_num_employees_ranges.join(', ')}</p></div>
            )}
            {apollo.technologies?.length && (
              <div><span className="text-gray-400 uppercase text-[10px]">Tech Filters</span><p className="text-gray-700 mt-0.5">{apollo.technologies.join(', ')}</p></div>
            )}
            {apollo.ready_to_paste_query_string && (
              <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="text-[10px] text-orange-600 uppercase font-medium">Ready to Paste</span>
                <CopyBtn text={apollo.ready_to_paste_query_string} field="apollo-query" />
                <p className="text-sm text-orange-900 font-mono mt-1">{apollo.ready_to_paste_query_string}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LinkedIn Sales Nav */}
      {linkedin && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-3 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">LinkedIn Sales Navigator</span>
          </div>
          <div className="p-3 space-y-2 text-xs">
            {linkedin.boolean_queries?.map((q, i) => (
              <div key={i} className="p-2 bg-gray-50 rounded font-mono text-gray-700 flex items-start justify-between">
                <span className="flex-1">{q}</span>
                <CopyBtn text={q} field={`linkedin-${i}`} />
              </div>
            ))}
            {linkedin.filter_recipe && <p className="text-gray-600 whitespace-pre-line">{linkedin.filter_recipe}</p>}
          </div>
        </div>
      )}

      {/* Qualification Rubric */}
      {rubric?.scoring_criteria?.length && (
        <div className="text-xs">
          <h4 className="font-semibold text-gray-500 uppercase mb-2">Qualification Scoring</h4>
          <div className="space-y-1.5">
            {rubric.scoring_criteria.map((c, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="font-bold text-blue-600 w-8 text-right">{c.weight_points}pt</span>
                <span className="font-medium text-gray-800 flex-1">{c.criterion}</span>
                <span className="text-gray-500">{c.how_to_check}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-2 text-[10px]">
            <span className="text-red-600">Hot ≥ {rubric.hot_threshold}</span>
            <span className="text-yellow-600">Warm ≥ {rubric.warm_threshold}</span>
            <span className="text-gray-500">Skip &lt; {rubric.skip_threshold}</span>
          </div>
        </div>
      )}

      {/* Pain Map */}
      {painMap?.length && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            <AlertTriangle className="w-3 h-3 inline mr-1" />Pain Map by Persona
          </h4>
          <div className="space-y-2">
            {painMap.map((p, i) => {
              const personaColor = p.persona === 'champion' ? 'border-green-200 bg-green-50'
                : p.persona === 'economic_buyer' ? 'border-blue-200 bg-blue-50'
                : 'border-red-200 bg-red-50'
              return (
                <div key={i} className={`p-2.5 border rounded-lg text-xs ${personaColor}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold capitalize">{p.persona.replace(/_/g, ' ')}</span>
                    <span className="text-gray-500">({p.title})</span>
                  </div>
                  <p className="text-gray-800"><span className="font-medium">Pain:</span> {p.core_pain}</p>
                  <p className="text-gray-600 mt-0.5"><span className="font-medium">Signal:</span> {p.live_signal}</p>
                  <p className="text-gray-700 mt-0.5"><span className="font-medium">Outreach angle:</span> {p.outreach_angle}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {d.recommended_next_action && (
        <div className="p-2.5 bg-emerald-50 rounded-lg text-xs text-emerald-800">
          <span className="font-semibold">Next Action:</span> {d.recommended_next_action}
        </div>
      )}
    </div>
  )
}
