interface Score {
  clarity: number
  buyer_pain: number
  specificity: number
  commercial_value: number
  differentiation: number
  cta_strength: number
  proof_credibility: number
  non_generic: number
}

interface Weakness {
  issue: string
  quote: string
  fix: string
}

interface ReviewData {
  review?: {
    scores?: Score
    average_score?: number
    verdict?: string
    verdict_reason?: string
    weaknesses?: Weakness[]
    improved_version?: string
    strengths?: string[]
    specific_edits?: string[]
    will_this_make_money?: string
  }
}

const SCORE_LABELS: Record<keyof Score, string> = {
  clarity: 'Clarity',
  buyer_pain: 'Buyer Pain',
  specificity: 'Specificity',
  commercial_value: 'Commercial Value',
  differentiation: 'Differentiation',
  cta_strength: 'CTA Strength',
  proof_credibility: 'Proof & Credibility',
  non_generic: 'Non-Generic',
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? 'bg-green-500' : score >= 6 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-600 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-6 text-right">{score}</span>
    </div>
  )
}

export default function CMOReviewPreview({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as ReviewData
  const review = d.review
  if (!review) return <p className="text-sm text-gray-500">No review data</p>

  const verdictColor = review.verdict === 'approve' ? 'bg-green-100 text-green-800 border-green-300'
    : review.verdict === 'revise' ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
    : 'bg-red-100 text-red-800 border-red-300'

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <div className={`p-3 rounded-lg border ${verdictColor}`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-bold uppercase">{review.verdict}</span>
          <span className="text-sm font-bold">{review.average_score?.toFixed(1)}/10</span>
        </div>
        <p className="text-sm">{review.verdict_reason}</p>
      </div>

      {/* Scores */}
      {review.scores && (
        <div className="space-y-1.5">
          {(Object.entries(review.scores) as [keyof Score, number][]).map(([key, score]) => (
            <ScoreBar key={key} label={SCORE_LABELS[key] || key} score={score} />
          ))}
        </div>
      )}

      {/* Will this make money */}
      {review.will_this_make_money && (
        <div className="p-2.5 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800"><span className="font-semibold">Revenue Impact:</span> {review.will_this_make_money}</p>
        </div>
      )}

      {/* Weaknesses */}
      {review.weaknesses && review.weaknesses.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Weaknesses</h4>
          <div className="space-y-2">
            {review.weaknesses.map((w, i) => (
              <div key={i} className="p-2.5 bg-red-50 rounded-lg text-xs">
                <p className="text-red-800 font-medium">{w.issue}</p>
                {w.quote && <p className="text-red-600 italic mt-1">&ldquo;{w.quote}&rdquo;</p>}
                <p className="text-red-700 mt-1"><span className="font-semibold">Fix:</span> {w.fix}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {review.strengths && review.strengths.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Strengths</h4>
          <ul className="space-y-1">
            {review.strengths.map((s, i) => (
              <li key={i} className="text-xs text-green-700 flex items-start gap-1.5">
                <span className="text-green-500 mt-0.5">+</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Specific Edits */}
      {review.specific_edits && review.specific_edits.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Required Edits</h4>
          <ol className="space-y-1 list-decimal list-inside">
            {review.specific_edits.map((e, i) => (
              <li key={i} className="text-xs text-gray-700">{e}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Improved Version */}
      {review.improved_version && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Improved Version</h4>
          <div className="p-3 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-900 whitespace-pre-line">{review.improved_version}</p>
          </div>
        </div>
      )}
    </div>
  )
}
