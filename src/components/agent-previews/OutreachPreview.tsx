'use client'

import { useState } from 'react'

interface OutreachMessage {
  channel: string
  sequence_step: number
  label: string
  subject: string | null
  body: string
  personalization_note: string
  timing: string
}

interface Objection {
  objection: string
  response: string
}

interface OutreachOutput {
  summary?: string
  outreach_sequence?: OutreachMessage[]
  objection_responses?: Objection[]
  outreach_tips?: string[]
  recommended_next_action?: string
}

const CHANNEL_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  email: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Email' },
  linkedin: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'LinkedIn' },
  whatsapp: { bg: 'bg-green-50', text: 'text-green-700', label: 'WhatsApp' },
  call_script: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Call' },
}

export default function OutreachPreview({ output }: { output: OutreachOutput }) {
  const [expandedMsg, setExpandedMsg] = useState<number | null>(0)

  return (
    <div className="space-y-6">
      {/* Outreach Sequence */}
      {output.outreach_sequence && output.outreach_sequence.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
            Outreach Sequence ({output.outreach_sequence.length} messages)
          </p>
          <div className="space-y-2">
            {output.outreach_sequence.map((msg, i) => {
              const style = CHANNEL_STYLES[msg.channel] || { bg: 'bg-gray-50', text: 'text-gray-700', label: msg.channel }
              return (
                <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div
                    className="p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                    onClick={() => setExpandedMsg(expandedMsg === i ? null : i)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-5">#{msg.sequence_step}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{msg.label}</span>
                    </div>
                    <span className="text-xs text-gray-400">{msg.timing}</span>
                  </div>
                  {expandedMsg === i && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      {msg.subject && (
                        <p className="text-xs text-gray-500 mb-2">
                          <span className="font-medium">Subject:</span> {msg.subject}
                        </p>
                      )}
                      <div className="p-3 bg-gray-50 rounded-lg mb-2">
                        <p className="text-sm text-gray-700 whitespace-pre-line">{msg.body}</p>
                      </div>
                      <p className="text-xs text-amber-600">
                        <span className="font-medium">Personalize:</span> {msg.personalization_note}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Objection Responses */}
      {output.objection_responses && output.objection_responses.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-3">Objection Responses</p>
          <div className="space-y-3">
            {output.objection_responses.map((obj, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-gray-900">&ldquo;{obj.objection}&rdquo;</p>
                <p className="text-sm text-gray-600 mt-1">{obj.response}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {output.outreach_tips && output.outreach_tips.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Outreach Tips</p>
          <ul className="space-y-1">
            {output.outreach_tips.map((tip, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-green-500 mt-0.5">&#x2713;</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {output.recommended_next_action && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700"><span className="font-semibold">Next step:</span> {output.recommended_next_action}</p>
        </div>
      )}
    </div>
  )
}
