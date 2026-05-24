'use client'

import TopBar from '@/components/layout/TopBar'
import { timeAgo } from '@/lib/utils'
import { Loader2, FolderOpen, Users, MessageSquare, Bell, FileText, Send, Briefcase } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ReportData {
  stats: {
    projects: number
    leads: number
    messages: number
    pending: number
    content: number
    outreach: number
    proposals: number
  }
  leadsByStatus: Record<string, number>
  proposalsByStatus: Record<string, number>
  recentActivity: Array<{ event_type: string; event_description: string; created_at: string }>
}

const getUserId = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('agd_user_id') || '00000000-0000-0000-0000-000000000001'
  }
  return '00000000-0000-0000-0000-000000000001'
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports', { headers: { 'x-user-id': getUserId() } })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <TopBar title="Reports" subtitle="Performance overview from real data" />
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading report...
        </div>
      </div>
    )
  }

  if (!data) return null

  const s = data.stats
  const cards = [
    { label: 'Projects', value: s.projects, icon: FolderOpen, color: 'bg-blue-50 text-blue-600' },
    { label: 'Leads', value: s.leads, icon: Users, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Agent Messages', value: s.messages, icon: MessageSquare, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Pending Review', value: s.pending, icon: Bell, color: 'bg-amber-50 text-amber-600' },
    { label: 'Content Assets', value: s.content, icon: FileText, color: 'bg-purple-50 text-purple-600' },
    { label: 'Outreach Messages', value: s.outreach, icon: Send, color: 'bg-orange-50 text-orange-600' },
    { label: 'Proposals', value: s.proposals, icon: Briefcase, color: 'bg-violet-50 text-violet-600' },
  ]

  const leadStatuses = Object.entries(data.leadsByStatus).sort((a, b) => b[1] - a[1])
  const proposalStatuses = Object.entries(data.proposalsByStatus).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <TopBar title="Reports" subtitle="Performance overview from real data" />
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {cards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-xs text-gray-500">{card.label}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Lead Pipeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Lead Pipeline</h3>
            {leadStatuses.length === 0 ? (
              <p className="text-xs text-gray-400">No leads yet</p>
            ) : (
              <div className="space-y-2">
                {leadStatuses.map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 capitalize">{status.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (count / s.leads) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proposal Pipeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Proposal Pipeline</h3>
            {proposalStatuses.length === 0 ? (
              <p className="text-xs text-gray-400">No proposals yet</p>
            ) : (
              <div className="space-y-2">
                {proposalStatuses.map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 capitalize">{status.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${Math.min(100, (count / s.proposals) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h3>
            {data.recentActivity.length === 0 ? (
              <p className="text-xs text-gray-400">No activity yet</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {data.recentActivity.map((act, i) => (
                  <div key={i} className="flex items-start gap-2 pb-2 border-b border-gray-50 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-700">{act.event_description}</p>
                      <p className="text-[10px] text-gray-400">{timeAgo(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
