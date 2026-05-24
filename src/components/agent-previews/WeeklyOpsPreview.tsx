interface MondayAction {
  priority: number
  action: string
  why: string
  time_estimate: string
}

interface WeeklyData {
  weekly_report?: {
    target?: string
    estimated_this_week?: string
    confidence_level?: string
    pipeline_snapshot?: {
      total_leads: number
      new_leads_this_week: number
      contacted: number
      replied: number
      meetings_booked: number
      proposals_sent: number
      won_this_month: number
      lost_this_month: number
    }
    bottleneck?: {
      stage: string
      problem: string
      fix: string
    }
    monday_actions?: MondayAction[]
    content_to_create?: string[]
    leads_to_contact?: string
    follow_ups_due?: string
    risks?: string[]
    wins?: string[]
  }
}

export default function WeeklyOpsPreview({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as WeeklyData
  const r = d.weekly_report
  if (!r) return <p className="text-sm text-gray-500">No report data</p>

  const p = r.pipeline_snapshot
  const confColor = r.confidence_level === 'high' ? 'text-green-700 bg-green-50'
    : r.confidence_level === 'medium' ? 'text-yellow-700 bg-yellow-50'
    : 'text-red-700 bg-red-50'

  return (
    <div className="space-y-4">
      {/* Revenue Header */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-[10px] text-gray-400 uppercase">Target</p>
          <p className="text-lg font-bold text-gray-900">{r.target}</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-[10px] text-blue-400 uppercase">Estimate</p>
          <p className="text-lg font-bold text-blue-700">{r.estimated_this_week}</p>
        </div>
        <div className={`p-3 rounded-lg text-center ${confColor}`}>
          <p className="text-[10px] uppercase opacity-70">Confidence</p>
          <p className="text-lg font-bold capitalize">{r.confidence_level}</p>
        </div>
      </div>

      {/* Pipeline */}
      {p && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pipeline Snapshot</h4>
          <div className="grid grid-cols-4 gap-2">
            {([
              ['Total Leads', p.total_leads, 'bg-gray-50'],
              ['New This Week', p.new_leads_this_week, 'bg-blue-50'],
              ['Contacted', p.contacted, 'bg-indigo-50'],
              ['Replied', p.replied, 'bg-cyan-50'],
              ['Meetings', p.meetings_booked, 'bg-emerald-50'],
              ['Proposals Sent', p.proposals_sent, 'bg-purple-50'],
              ['Won (month)', p.won_this_month, 'bg-green-50'],
              ['Lost (month)', p.lost_this_month, 'bg-red-50'],
            ] as [string, number, string][]).map(([label, val, bg]) => (
              <div key={label} className={`p-2 rounded-lg ${bg} text-center`}>
                <p className="text-lg font-bold text-gray-900">{val}</p>
                <p className="text-[10px] text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottleneck */}
      {r.bottleneck && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs font-bold text-red-800 uppercase mb-1">Bottleneck: {r.bottleneck.stage}</p>
          <p className="text-xs text-red-700">{r.bottleneck.problem}</p>
          <p className="text-xs text-red-800 mt-1"><span className="font-semibold">Fix:</span> {r.bottleneck.fix}</p>
        </div>
      )}

      {/* Monday Actions */}
      {r.monday_actions && r.monday_actions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">This Week&apos;s Actions</h4>
          <div className="space-y-2">
            {r.monday_actions.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 bg-white border border-gray-200 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {a.priority}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{a.action}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.why}</p>
                </div>
                {a.time_estimate && (
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{a.time_estimate}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-ups */}
      {r.follow_ups_due && (
        <div className="p-2.5 bg-amber-50 rounded-lg">
          <p className="text-xs text-amber-800"><span className="font-semibold">Follow-ups Due:</span> {r.follow_ups_due}</p>
        </div>
      )}

      {/* Leads to Contact */}
      {r.leads_to_contact && (
        <div className="p-2.5 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800"><span className="font-semibold">Contact This Week:</span> {r.leads_to_contact}</p>
        </div>
      )}

      {/* Wins */}
      {r.wins && r.wins.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Wins</h4>
          <ul className="space-y-0.5">
            {r.wins.map((w, i) => <li key={i} className="text-xs text-green-700">+ {w}</li>)}
          </ul>
        </div>
      )}

      {/* Risks */}
      {r.risks && r.risks.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Risks</h4>
          <ul className="space-y-0.5">
            {r.risks.map((risk, i) => <li key={i} className="text-xs text-red-600">- {risk}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
