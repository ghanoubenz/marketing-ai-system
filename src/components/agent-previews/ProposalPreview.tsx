import { DollarSign, Clock, CheckCircle, ArrowRight } from 'lucide-react'

interface ScopePhase {
  phase: string
  deliverables: string[]
  timeline: string
}

interface PricingTier {
  name: string
  price: string
  includes: string[]
  best_for: string
}

interface ProposalOutput {
  proposal?: {
    title?: string
    executive_summary?: string
    problem_statement?: string
    proposed_solution?: string
    scope_of_work?: ScopePhase[]
    pricing_tiers?: PricingTier[]
    timeline_overview?: string
    proof_points?: string[]
    next_steps?: string
    terms?: string
  }
  recommended_next_action?: string
}

export default function ProposalPreview({ data }: { data: ProposalOutput }) {
  const p = data.proposal
  if (!p) return <p className="text-sm text-gray-500">No proposal data</p>

  return (
    <div className="space-y-4">
      {p.title && <h3 className="text-lg font-bold text-gray-900">{p.title}</h3>}

      {p.executive_summary && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">{p.executive_summary}</p>
        </div>
      )}

      {p.problem_statement && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">The Problem</h4>
          <p className="text-sm text-gray-700">{p.problem_statement}</p>
        </div>
      )}

      {p.proposed_solution && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Our Solution</h4>
          <p className="text-sm text-gray-700">{p.proposed_solution}</p>
        </div>
      )}

      {p.scope_of_work && p.scope_of_work.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Scope of Work</h4>
          <div className="space-y-2">
            {p.scope_of_work.map((phase, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-900">{phase.phase}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" />{phase.timeline}</span>
                </div>
                <ul className="space-y-0.5">
                  {phase.deliverables.map((d, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />{d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.pricing_tiers && p.pricing_tiers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pricing</h4>
          <div className="grid grid-cols-3 gap-3">
            {p.pricing_tiers.map((tier, i) => (
              <div key={i} className={`border rounded-lg p-3 ${i === 1 ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-200' : 'border-gray-200'}`}>
                <p className="text-xs font-medium text-gray-500 uppercase">{tier.name}</p>
                <p className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-1"><DollarSign className="w-4 h-4" />{tier.price.replace(/^\$/, '')}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 mb-2">{tier.best_for}</p>
                <ul className="space-y-1">
                  {tier.includes.map((item, j) => (
                    <li key={j} className="text-xs text-gray-600 flex items-start gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.timeline_overview && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="font-medium">Timeline:</span> {p.timeline_overview}
        </div>
      )}

      {p.proof_points && p.proof_points.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Proof Points</h4>
          <ul className="space-y-1">{p.proof_points.map((pp, i) => <li key={i} className="text-xs text-gray-600">• {pp}</li>)}</ul>
        </div>
      )}

      {p.next_steps && (
        <div className="p-3 bg-emerald-50 rounded-lg flex items-start gap-2">
          <ArrowRight className="w-4 h-4 text-emerald-600 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase mb-0.5">Next Steps</p>
            <p className="text-sm text-emerald-800">{p.next_steps}</p>
          </div>
        </div>
      )}

      {p.terms && <p className="text-xs text-gray-400 italic">{p.terms}</p>}

      {data.recommended_next_action && (
        <div className="p-2.5 bg-blue-50 rounded-lg text-xs text-blue-800">
          <span className="font-semibold">Recommended:</span> {data.recommended_next_action}
        </div>
      )}
    </div>
  )
}
