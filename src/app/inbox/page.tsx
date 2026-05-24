'use client'

import TopBar from '@/components/layout/TopBar'
import PriorityBadge from '@/components/ui/PriorityBadge'
import StatusBadge from '@/components/ui/StatusBadge'
import { messagesApi, agentsApi } from '@/lib/api-client'
import { timeAgo, formatStatus } from '@/lib/utils'
import type { DbAgentMessage } from '@/lib/supabase/types'
import LandingPagePreview from '@/components/inbox/LandingPagePreview'
import ContentPreview from '@/components/agent-previews/ContentPreview'
import ImagePromptPreview from '@/components/agent-previews/ImagePromptPreview'
import OutreachPreview from '@/components/agent-previews/OutreachPreview'
import LeadResearchPreview from '@/components/agent-previews/LeadResearchPreview'
import ProposalPreview from '@/components/agent-previews/ProposalPreview'
import CMOReviewPreview from '@/components/agent-previews/CMOReviewPreview'
import WeeklyOpsPreview from '@/components/agent-previews/WeeklyOpsPreview'
import CarouselDesignPreview from '@/components/agent-previews/CarouselDesignPreview'
import ProductStrategyPreview from '@/components/agent-previews/ProductStrategyPreview'
import ResearchPreview from '@/components/agent-previews/ResearchPreview'
import GenericPreview from '@/components/agent-previews/GenericPreview'
import { AlertCircle, Check, X, Edit3, UserCheck, CheckCircle, Loader2, ChevronDown, ChevronUp, Inbox, Shield, RefreshCw, Send, Zap } from 'lucide-react'
import React, { useState, useEffect, useCallback } from 'react'

export default function InboxPage() {
  const [messages, setMessages] = useState<DbAgentMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editSummary, setEditSummary] = useState('')

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      const data = await messagesApi.list({ status: filter === 'all' ? undefined : filter })
      setMessages(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { loadMessages() }, [loadMessages])

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'done') => {
    setActionLoading(id)
    try {
      if (action === 'approve') {
        const result = await messagesApi.approve(id)
        if (result?.pipeline?.triggered?.length > 0) {
          setPipelineNotice(`Approved & triggered: ${result.pipeline.triggered.join(', ')}`)
          setTimeout(() => setPipelineNotice(null), 6000)
        }
      }
      else if (action === 'reject') await messagesApi.reject(id)
      else if (action === 'done') await messagesApi.markDone(id)
      await loadMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEdit = async (id: string) => {
    setActionLoading(id)
    try {
      await messagesApi.edit(id, { summary: editSummary })
      setEditing(null)
      await loadMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save edit')
    } finally {
      setActionLoading(null)
    }
  }

  const [reviewLoading, setReviewLoading] = useState<string | null>(null)
  const [improveLoading, setImproveLoading] = useState<string | null>(null)
  const [rejectDialog, setRejectDialog] = useState<string | null>(null)
  const [sendToMenu, setSendToMenu] = useState<string | null>(null)
  const [sendLoading, setSendLoading] = useState<string | null>(null)
  const [pipelineNotice, setPipelineNotice] = useState<string | null>(null)

  const SEND_TARGETS = [
    { slug: 'content', label: 'Content Agent', icon: '📝' },
    { slug: 'outreach', label: 'Outreach Agent', icon: '📧' },
    { slug: 'landing-page', label: 'Landing Page Agent', icon: '🌐' },
    { slug: 'lead-research', label: 'Lead Research Agent', icon: '🔍' },
    { slug: 'carousel-design', label: 'Carousel Agent', icon: '🎨' },
    { slug: 'proposal', label: 'Proposal Agent', icon: '📋' },
    { slug: 'cmo-review', label: 'CMO Review', icon: '🎯' },
    { slug: 'improve', label: 'Improve', icon: '⬆️' },
    { slug: 'research', label: 'Research Agent', icon: '🧠' },
  ]

  const handleSendTo = async (messageId: string, targetAgent: string) => {
    setSendLoading(messageId)
    setSendToMenu(null)
    try {
      const result = await agentsApi.sendToAgent(messageId, targetAgent)
      setPipelineNotice(`Sent to ${targetAgent} successfully`)
      setTimeout(() => setPipelineNotice(null), 4000)
      await loadMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSendLoading(null)
    }
  }

  const handleCMOReview = async (messageId: string) => {
    setReviewLoading(messageId)
    try {
      await agentsApi.runCMOReview(messageId)
      await loadMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CMO Review failed')
    } finally {
      setReviewLoading(null)
    }
  }

  const handleImprove = async (messageId: string, reviewMessageId?: string) => {
    setImproveLoading(messageId)
    try {
      await agentsApi.improve(messageId, reviewMessageId)
      await loadMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Improve failed')
    } finally {
      setImproveLoading(null)
    }
  }

  const renderAgentOutput = (agentName: string, payload: Record<string, unknown>, messageId?: string) => {
    const PREVIEW_MAP: Record<string, (p: Record<string, unknown>) => React.ReactNode> = {
      'Landing Page Agent': (p) => <LandingPagePreview output={p} />,
      'Content Agent': (p) => <ContentPreview output={p} />,
      'Image Prompt Agent': (p) => <ImagePromptPreview output={p} />,
      'Outreach Agent': (p) => <OutreachPreview output={p} />,
      'Lead Research Agent': (p) => <LeadResearchPreview data={p} />,
      'Proposal Agent': (p) => <ProposalPreview data={p} />,
      'CMO Review Agent': (p) => <CMOReviewPreview data={p} />,
      'Weekly Ops Agent': (p) => <WeeklyOpsPreview data={p} />,
      'Weekly CEO Report Agent': (p) => <WeeklyOpsPreview data={p} />,
      'Carousel Design Agent': (p) => <CarouselDesignPreview data={p} messageId={messageId} />,
      'Carousel / One-Pager Agent': (p) => <CarouselDesignPreview data={p} messageId={messageId} />,
      'Product Strategy Agent': (p) => <ProductStrategyPreview data={p} />,
      'Research Agent': (p) => <ResearchPreview data={p} />,
      'Learning Agent': (p) => <ResearchPreview data={p} />,
    }

    const renderer = PREVIEW_MAP[agentName]
    if (renderer) {
      return <div className="overflow-auto max-h-[800px]">{renderer(payload)}</div>
    }

    return <GenericPreview data={payload} />
  }

  const pendingCount = messages.filter(m => m.status === 'needs_review').length

  return (
    <div>
      <TopBar title="Agent Inbox" subtitle="Messages from your AI team" />
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 font-medium">Dismiss</button>
          </div>
        )}

        {pipelineNotice && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {pipelineNotice}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          {[
            { key: 'all', label: 'All' },
            { key: 'needs_review', label: 'Needs Review' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'done', label: 'Done' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === f.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
              {f.key === 'needs_review' && pendingCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">No messages yet</p>
            <p className="text-sm text-gray-400">Run an agent from the Projects page to see messages here</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {messages.map(msg => {
              const isExpanded = expanded === msg.id
              const agentName = (msg.agent as { name: string } | undefined)?.name || 'Agent'
              const projectName = (msg.project as { name: string } | undefined)?.name || ''

              return (
                <div key={msg.id} className="hover:bg-gray-50 transition-colors">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : msg.id)}>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{agentName}</span>
                          <PriorityBadge priority={msg.priority} />
                          <StatusBadge status={msg.status} />
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">{formatStatus(msg.approval_level)}</span>
                          {msg.requires_human && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" /> Needs your input
                            </span>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>

                        <p className="text-sm font-medium text-gray-800 mb-1">{msg.title}</p>
                        {msg.summary && <p className="text-sm text-gray-600 mb-2">{msg.summary}</p>}

                        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                          {projectName && <span>Project: {projectName}</span>}
                          <span>{timeAgo(msg.created_at)}</span>
                          {msg.confidence !== null && <span>Confidence: {Math.round(Number(msg.confidence) * 100)}%</span>}
                          {!!(msg.input_payload as Record<string, unknown>)?.pipeline && (
                            <span className="inline-flex items-center gap-1 text-indigo-500 font-medium">
                              <Zap className="w-3 h-3" />
                              via {String(((msg.input_payload as Record<string, unknown>)?.pipeline as Record<string, string>)?.triggered_by || 'pipeline')}
                            </span>
                          )}
                          {!!(msg.input_payload as Record<string, unknown>)?.improved_from && (
                            <span className="inline-flex items-center gap-1 text-purple-500 font-medium">
                              <RefreshCw className="w-3 h-3" /> improved version
                            </span>
                          )}
                        </div>

                        {msg.recommended_action && (
                          <div className="mt-3 p-2.5 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-700">
                              <span className="font-semibold">Suggested:</span> {msg.recommended_action}
                            </p>
                          </div>
                        )}
                      </div>

                      {(msg.status === 'needs_review' || msg.status === 'edited') && (
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleAction(msg.id, 'approve')}
                            disabled={actionLoading === msg.id}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                          </button>
                          {agentName === 'CMO Review Agent' && (
                            <button
                              onClick={() => {
                                const payload = msg.output_payload as Record<string, unknown> | undefined
                                const reviewedMsgId = (msg.input_payload as Record<string, unknown>)?.message_id as string | undefined
                                if (reviewedMsgId) handleImprove(reviewedMsgId, msg.id)
                              }}
                              disabled={improveLoading === msg.id}
                              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                              {improveLoading === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Improve Output
                            </button>
                          )}
                          {agentName !== 'CMO Review Agent' && agentName !== 'Weekly Ops Agent' && (
                            <button
                              onClick={() => handleCMOReview(msg.id)}
                              disabled={reviewLoading === msg.id}
                              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                            >
                              {reviewLoading === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />} CMO Review
                            </button>
                          )}
                          <div className="relative">
                            <button
                              onClick={() => setSendToMenu(sendToMenu === msg.id ? null : msg.id)}
                              disabled={sendLoading === msg.id}
                              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 w-full"
                            >
                              {sendLoading === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send to Agent
                            </button>
                            {sendToMenu === msg.id && (
                              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                                {SEND_TARGETS
                                  .filter(t => t.slug !== agentName.toLowerCase().replace(/\s+agent$/i, '').replace(/\s+/g, '-'))
                                  .map(target => (
                                  <button
                                    key={target.slug}
                                    onClick={() => handleSendTo(msg.id, target.slug)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                                  >
                                    <span>{target.icon}</span> {target.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => { setEditing(msg.id); setEditSummary(msg.summary || '') }}
                            disabled={actionLoading === msg.id}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => setRejectDialog(msg.id)}
                            disabled={actionLoading === msg.id}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() => handleAction(msg.id, 'done')}
                            disabled={actionLoading === msg.id}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Mark Done
                          </button>
                        </div>
                      )}

                      {msg.status === 'approved' && (
                        <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium flex-shrink-0">
                          <CheckCircle className="w-4 h-4" /> Approved
                        </div>
                      )}
                    </div>
                  </div>

                  {editing === msg.id && (
                    <div className="px-5 pb-4 border-t border-amber-100 pt-4 bg-amber-50/50">
                      <h4 className="text-xs font-semibold text-amber-700 uppercase mb-2">Edit Summary</h4>
                      <textarea
                        value={editSummary}
                        onChange={e => setEditSummary(e.target.value)}
                        rows={3}
                        className="w-full text-sm border border-amber-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEdit(msg.id)}
                          disabled={actionLoading === msg.id}
                          className="px-4 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                        >
                          {actionLoading === msg.id ? 'Saving...' : 'Save Edit'}
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="px-4 py-1.5 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {rejectDialog === msg.id && (
                    <div className="px-5 pb-4 border-t border-red-100 pt-4 bg-red-50/50">
                      <h4 className="text-sm font-semibold text-red-700 mb-3">What would you like to do?</h4>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setRejectDialog(null); handleImprove(msg.id) }}
                          disabled={improveLoading === msg.id}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          {improveLoading === msg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Improve (Regenerate)
                        </button>
                        <button
                          onClick={() => { setRejectDialog(null); handleAction(msg.id, 'reject') }}
                          disabled={actionLoading === msg.id}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel (Reject permanently)
                        </button>
                        <button
                          onClick={() => setRejectDialog(null)}
                          className="px-4 py-2 text-xs font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                        >
                          Never mind
                        </button>
                      </div>
                    </div>
                  )}

                  {isExpanded && msg.output_payload && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Agent Output</h4>
                      {renderAgentOutput(agentName, msg.output_payload as Record<string, unknown>, msg.id)}
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
