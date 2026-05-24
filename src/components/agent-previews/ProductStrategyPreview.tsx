'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface Props {
  data: Record<string, unknown>
}

export default function ProductStrategyPreview({ data }: Props) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const offer = data.one_line_offer as string | undefined
  const summary = data.summary as string | undefined
  const explanation = data.simple_explanation as string | undefined
  const positioning = data.positioning as Record<string, unknown> | undefined
  const target = data.target_customer as Record<string, unknown> | undefined
  const pricing = data.pricing as Record<string, unknown> | undefined
  const packages = data.offer_packages as Array<Record<string, unknown>> | undefined
  const pains = data.buyer_pains as Array<Record<string, unknown>> | undefined
  const objections = data.objections as Array<Record<string, unknown>> | undefined
  const risks = data.risks as Array<Record<string, unknown>> | undefined
  const outreach = data.outreach_angle as Record<string, unknown> | undefined
  const landing = data.landing_page_angle as Record<string, unknown> | undefined
  const jtbd = data.jtbd as Record<string, unknown> | undefined
  const nextActions = data.recommended_next_actions as Array<string | Record<string, unknown>> | undefined

  const CopyBtn = ({ k, text }: { k: string; text: string }) => (
    <button onClick={() => copy(k, text)} className="ml-2 text-gray-300 hover:text-gray-500 inline-flex">
      {copied === k ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  )

  return (
    <div className="space-y-4 text-sm">
      {/* Offer */}
      {offer && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">One-Line Offer</span>
          <p className="text-base font-bold text-gray-900 mt-1">{offer}<CopyBtn k="offer" text={offer} /></p>
        </div>
      )}

      {summary && <p className="text-gray-600">{summary}</p>}
      {explanation && <p className="text-gray-500 italic">{explanation}</p>}

      {/* Target Customer */}
      {target && (
        <Section title="Target Customer">
          <Field label="Primary ICP" value={target.primary_icp} />
          <Field label="Secondary ICP" value={target.secondary_icp} />
          <Field label="Buyer Titles" value={target.buyer_titles} />
          <Field label="Company Size" value={target.company_size} />
          <Field label="Industries" value={target.best_industries} />
        </Section>
      )}

      {/* Positioning */}
      {positioning && (
        <Section title="Positioning">
          <Field label="Category" value={positioning.category} />
          <Field label="Differentiation" value={positioning.differentiation} />
          <Field label="Why Now" value={positioning.why_now} />
          <Field label="Proof Angle" value={positioning.proof_angle} />
          <Field label="Value for Buyer" value={positioning.value_for_buyer} />
          <Field label="vs Alternatives" value={positioning.competitive_alternatives} />
        </Section>
      )}

      {/* Pricing */}
      {pricing && (
        <Section title="Pricing">
          <Field label="Pilot Price" value={pricing.pilot_price} />
          <Field label="Standard Price" value={pricing.standard_price} />
          <Field label="Upsell" value={pricing.upsell} />
          <Field label="Logic" value={pricing.pricing_logic} />
        </Section>
      )}

      {/* Packages */}
      {packages && packages.length > 0 && (
        <Section title="Offer Packages">
          <div className="grid gap-2">
            {packages.map((pkg, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900">{String(pkg.name || pkg.package_name || `Package ${i + 1}`)}</p>
                {pkg.price ? <p className="text-sm text-green-700 font-medium">{String(pkg.price)}</p> : null}
                {pkg.description ? <p className="text-xs text-gray-600 mt-1">{String(pkg.description)}</p> : null}
                {pkg.includes ? <p className="text-xs text-gray-500 mt-1">Includes: {Array.isArray(pkg.includes) ? (pkg.includes as string[]).join(', ') : String(pkg.includes)}</p> : null}
                {pkg.deliverables ? <p className="text-xs text-gray-500 mt-1">Deliverables: {Array.isArray(pkg.deliverables) ? (pkg.deliverables as string[]).join(', ') : String(pkg.deliverables)}</p> : null}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Buyer Pains */}
      {pains && pains.length > 0 && (
        <Section title="Buyer Pains">
          {pains.map((p, i) => (
            <div key={i} className="mb-2">
              <p className="font-medium text-gray-800">{String(p.pain || p.title || p.problem || Object.values(p)[0])}</p>
              {p.impact ? <p className="text-xs text-gray-500">Impact: {String(p.impact)}</p> : null}
              {p.solution ? <p className="text-xs text-green-700">Solution: {String(p.solution)}</p> : null}
            </div>
          ))}
        </Section>
      )}

      {/* JTBD */}
      {jtbd && (
        <Section title="Jobs to Be Done">
          <Field label="Job" value={jtbd.job_to_be_done} />
          <Field label="Struggling Moment" value={jtbd.struggling_moment} />
          <Field label="Hire Criteria" value={jtbd.hire_criteria} />
          <Field label="Fire Criteria" value={jtbd.fire_criteria} />
        </Section>
      )}

      {/* Objections */}
      {objections && objections.length > 0 && (
        <Section title="Common Objections & Responses">
          {objections.map((obj, i) => (
            <div key={i} className="mb-2">
              <p className="font-medium text-red-700">&ldquo;{String(obj.objection || obj.question || Object.values(obj)[0])}&rdquo;</p>
              {obj.response ? <p className="text-xs text-gray-700 mt-0.5">{String(obj.response || obj.answer)}</p> : null}
            </div>
          ))}
        </Section>
      )}

      {/* Outreach Angle */}
      {outreach && (
        <Section title="Outreach Angle">
          <Field label="Channel" value={outreach.best_channel} />
          <Field label="Opening Line" value={outreach.opening_line_strategy} />
          <Field label="Short Pitch" value={outreach.short_pitch} />
        </Section>
      )}

      {/* Landing Page Angle */}
      {landing && (
        <Section title="Landing Page">
          <Field label="Headline" value={landing.headline} />
          <Field label="Subheadline" value={landing.subheadline} />
          <Field label="Primary CTA" value={landing.primary_cta} />
          <Field label="Secondary CTA" value={landing.secondary_cta} />
        </Section>
      )}

      {/* Risks */}
      {risks && risks.length > 0 && (
        <Section title="Risks">
          {risks.map((r, i) => (
            <div key={i} className="mb-1">
              <p className="text-gray-700">{String(r.risk || r.title || Object.values(r)[0])}</p>
              {r.mitigation ? <p className="text-xs text-gray-500">Mitigation: {String(r.mitigation)}</p> : null}
            </div>
          ))}
        </Section>
      )}

      {/* Next Actions */}
      {nextActions && nextActions.length > 0 && (
        <Section title="Recommended Next Actions">
          <ol className="list-decimal list-inside space-y-1">
            {nextActions.map((a, i) => (
              <li key={i} className="text-gray-700">{typeof a === 'string' ? a : String((a as Record<string, unknown>).action || Object.values(a)[0])}</li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{title}</h4>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (!value) return null
  const text = Array.isArray(value) ? (value as string[]).join(', ') : String(value)
  return (
    <div className="mb-1.5">
      <span className="text-xs font-medium text-gray-500">{label}: </span>
      <span className="text-sm text-gray-800">{text}</span>
    </div>
  )
}
