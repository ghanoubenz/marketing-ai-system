'use client'

import TopBar from '@/components/layout/TopBar'
import { proposalsApi } from '@/lib/api-client'
import { timeAgo } from '@/lib/utils'
import { FileText, Loader2, Inbox, ChevronDown, ChevronUp, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface Proposal {
  id: string
  title: string
  scope: string | null
  price: string | null
  timeline: string | null
  body: string | null
  status: string
  created_at: string
  project?: { id: string; name: string }
  lead?: { id: string; company_name: string; contact_name: string | null }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  needs_review: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-blue-50 text-blue-700',
  sent: 'bg-indigo-50 text-indigo-700',
  won: 'bg-green-50 text-green-700',
  lost: 'bg-red-50 text-red-700',
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await proposalsApi.list(filter === 'all' ? undefined : { status: filter })
      setProposals(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await proposalsApi.update(id, { status })
      setProposals(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    } catch { /* ignore */ }
  }

  const statuses = ['all', 'approved', 'sent', 'won', 'lost']

  return (
    <div>
      <TopBar title="Proposals" subtitle="Track and manage client proposals" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">{proposals.length} proposals</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading proposals...
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">No proposals yet</p>
            <p className="text-sm text-gray-400">Run the Proposal Agent from the Projects page</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map(prop => {
              const isExpanded = expanded === prop.id
              let pricingTiers: Array<{ name: string; price: string }> = []
              try { pricingTiers = JSON.parse(prop.price || '[]') } catch { /* ignore */ }
              let proposalBody: Record<string, unknown> | null = null
              try { proposalBody = JSON.parse(prop.body || '{}') } catch { /* ignore */ }

              return (
                <div key={prop.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                  <div
                    className="p-4 cursor-pointer flex items-center justify-between gap-4"
                    onClick={() => setExpanded(isExpanded ? null : prop.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">{prop.title}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[prop.status] || 'bg-gray-100 text-gray-600'}`}>
                            {prop.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {prop.project?.name && <span>{prop.project.name}</span>}
                          {prop.lead?.company_name && <span className="text-blue-600">{prop.lead.company_name}</span>}
                          {pricingTiers.length > 0 && (
                            <span className="flex items-center gap-0.5"><DollarSign className="w-3 h-3" />{pricingTiers.map(t => t.price).join(' / ')}</span>
                          )}
                          {prop.timeline && <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{prop.timeline}</span>}
                          <span>{timeAgo(prop.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-400">Status:</label>
                        <select
                          value={prop.status}
                          onChange={e => handleStatusChange(prop.id, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="px-2 py-1 border border-gray-200 rounded text-xs"
                        >
                          {['draft', 'approved', 'sent', 'won', 'lost'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {proposalBody && (
                        <>
                          {(proposalBody.executive_summary as string) && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-800">{proposalBody.executive_summary as string}</p>
                            </div>
                          )}

                          {pricingTiers.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {pricingTiers.map((tier: { name: string; price: string; includes?: string[]; best_for?: string }, i: number) => (
                                <div key={i} className={`border rounded-lg p-2.5 ${i === 1 ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'}`}>
                                  <p className="text-[10px] text-gray-400 uppercase">{tier.name}</p>
                                  <p className="text-sm font-bold text-gray-900">{tier.price}</p>
                                  {tier.best_for && <p className="text-[10px] text-gray-400 mt-0.5">{tier.best_for}</p>}
                                  {tier.includes && (
                                    <ul className="mt-1.5 space-y-0.5">
                                      {tier.includes.map((item: string, j: number) => (
                                        <li key={j} className="text-[10px] text-gray-600 flex items-start gap-1">
                                          <CheckCircle className="w-2.5 h-2.5 text-green-500 mt-0.5 flex-shrink-0" />{item}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {(proposalBody.next_steps as string) && (
                            <div className="p-2.5 bg-emerald-50 rounded-lg text-xs text-emerald-800">
                              <span className="font-semibold">Next Steps:</span> {proposalBody.next_steps as string}
                            </div>
                          )}

                          <details>
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">Show full proposal</summary>
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg overflow-auto max-h-[400px]">
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                                {JSON.stringify(proposalBody, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
