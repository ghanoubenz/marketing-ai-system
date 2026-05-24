'use client'

import TopBar from '@/components/layout/TopBar'
import StatusBadge from '@/components/ui/StatusBadge'
import PriorityBadge from '@/components/ui/PriorityBadge'
import { projectsApi, messagesApi, agentsApi } from '@/lib/api-client'
import type { DbProject, DbAgentMessage } from '@/lib/supabase/types'
import { Package, Inbox, AlertCircle, Loader2, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { timeAgo } from '@/lib/utils'

function WeeklyOpsButton() {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleRun = async () => {
    setRunning(true)
    setResult(null)
    try {
      await agentsApi.runWeeklyOps()
      setResult('Weekly Ops report generated! Check Agent Inbox.')
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && <span className={`text-xs ${result.includes('generated') ? 'text-green-600' : 'text-red-600'}`}>{result}</span>}
      <button
        onClick={handleRun}
        disabled={running}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
        {running ? 'Analyzing...' : 'Run Weekly Ops'}
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<DbProject[]>([])
  const [messages, setMessages] = useState<DbAgentMessage[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([
        projectsApi.list(),
        messagesApi.list(),
      ])
      setProjects(p)
      setMessages(m)
    } catch {
      // silently fail on dashboard — individual pages have error handling
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const pendingMessages = messages.filter(m => m.status === 'needs_review')
  const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'testing')

  if (loading) {
    return (
      <div>
        <TopBar title="Dashboard" subtitle="Your AI marketing command center" />
        <div className="flex items-center justify-center py-32 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar title="Dashboard" subtitle="Your AI marketing command center" />

      <div className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Projects</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{projects.length}</p>
            <p className="text-xs text-gray-400 mt-1">{activeProjects.length} active</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Agent Inbox</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{pendingMessages.length}</p>
            <p className="text-xs text-gray-400 mt-1">needs review</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Messages</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{messages.length}</p>
            <p className="text-xs text-gray-400 mt-1">all time</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Agent Inbox */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Agent Inbox</h2>
                {pendingMessages.length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingMessages.length}</span>
                )}
              </div>
              <Link href="/inbox" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</Link>
            </div>

            {pendingMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No pending messages. Run an agent from the Projects page.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pendingMessages.slice(0, 5).map(msg => {
                  const agentName = (msg.agent as { name: string } | undefined)?.name || 'Agent'
                  return (
                    <div key={msg.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{agentName}</span>
                            <PriorityBadge priority={msg.priority} />
                            {msg.requires_human && (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertCircle className="w-3 h-3" /> Needs you
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">{msg.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{timeAgo(msg.created_at)}</p>
                        </div>
                        <Link href="/inbox" className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
                          Review
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Projects */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold text-gray-900 text-sm">Projects</h2>
              </div>
              <Link href="/products" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all</Link>
            </div>

            {projects.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-400 mb-3">No projects yet</p>
                <Link href="/products" className="text-sm text-blue-600 hover:text-blue-700 font-medium">Create first project</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {projects.slice(0, 5).map(project => (
                  <div key={project.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        {project.approved_offer && <p className="text-xs text-green-600 mt-0.5 truncate max-w-[200px]">{project.approved_offer}</p>}
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Weekly Ops */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Weekly Ops</h2>
              <span className="text-xs text-gray-400">Pipeline analysis + action plan</span>
            </div>
            <WeeklyOpsButton />
          </div>
        </div>
      </div>
    </div>
  )
}
