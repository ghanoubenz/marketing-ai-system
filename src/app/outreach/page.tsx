'use client'

import TopBar from '@/components/layout/TopBar'
import { outreachApi } from '@/lib/api-client'
import { timeAgo } from '@/lib/utils'
import { Mail, Link, Phone, MessageSquare, Loader2, Inbox, ChevronDown, ChevronUp, Copy, Check, Edit3, Save } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface OutreachMessage {
  id: string
  channel: string
  sequence_step: number
  subject: string | null
  body: string
  status: string
  created_at: string
  project?: { id: string; name: string }
  lead?: { id: string; company_name: string } | null
}

const CHANNEL_CONFIG: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  email: { label: 'Email', color: 'bg-blue-50 text-blue-700', icon: Mail },
  linkedin: { label: 'LinkedIn', color: 'bg-indigo-50 text-indigo-700', icon: Link },
  whatsapp: { label: 'WhatsApp', color: 'bg-green-50 text-green-700', icon: MessageSquare },
  call_script: { label: 'Call Script', color: 'bg-amber-50 text-amber-700', icon: Phone },
}

const STATUS_OPTIONS = ['draft', 'approved', 'manually_sent', 'rejected'] as const
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  approved: 'bg-green-50 text-green-700',
  manually_sent: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-700',
}

export default function OutreachPage() {
  const [messages, setMessages] = useState<OutreachMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await outreachApi.list(filter === 'all' ? undefined : { channel: filter })
      setMessages(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleCopy = async (msg: OutreachMessage) => {
    const text = msg.subject ? `Subject: ${msg.subject}\n\n${msg.body}` : msg.body
    await navigator.clipboard.writeText(text)
    setCopied(msg.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await outreachApi.update(id, { status })
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m))
    } catch { /* ignore */ }
  }

  const handleSaveEdit = async (id: string) => {
    setSaving(true)
    try {
      const update: Record<string, unknown> = { body: editBody }
      if (editSubject) update.subject = editSubject
      await outreachApi.update(id, update)
      setMessages(prev => prev.map(m => m.id === id ? { ...m, body: editBody, subject: editSubject || m.subject } : m))
      setEditing(null)
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const channels = ['all', 'email', 'linkedin', 'whatsapp', 'call_script']

  // Group by project
  const grouped = messages.reduce<Record<string, OutreachMessage[]>>((acc, msg) => {
    const key = msg.project?.name || 'No Project'
    if (!acc[key]) acc[key] = []
    acc[key].push(msg)
    return acc
  }, {})

  return (
    <div>
      <TopBar title="Outreach Sequences" subtitle="Copy, edit, and track your outreach messages" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          {channels.map(ch => (
            <button
              key={ch}
              onClick={() => setFilter(ch)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === ch ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {ch === 'all' ? 'All' : CHANNEL_CONFIG[ch]?.label || ch}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">{messages.length} messages</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading outreach...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">No outreach messages yet</p>
            <p className="text-sm text-gray-400">Run and approve the Outreach Agent from the Projects page</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([projectName, msgs]) => (
              <div key={projectName}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{projectName}</h3>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {msgs.map(msg => {
                    const config = CHANNEL_CONFIG[msg.channel] || { label: msg.channel, color: 'bg-gray-50 text-gray-700', icon: Mail }
                    const Icon = config.icon
                    const isExpanded = expanded === msg.id
                    const isEditing = editing === msg.id

                    return (
                      <div key={msg.id}>
                        <div className="p-4 flex items-center justify-between gap-4">
                          <div
                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                            onClick={() => setExpanded(isExpanded ? null : msg.id)}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">Step {msg.sequence_step}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${config.color}`}>{config.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[msg.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {msg.status.replace(/_/g, ' ')}
                                </span>
                                {msg.lead?.company_name && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{msg.lead.company_name}</span>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-900 truncate mt-0.5">
                                {msg.subject || msg.body.substring(0, 60) + '...'}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleCopy(msg)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              {copied === msg.id ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                              {copied === msg.id ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              onClick={() => { setEditing(msg.id); setEditBody(msg.body); setEditSubject(msg.subject || ''); setExpanded(msg.id) }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <select
                              value={msg.status}
                              onChange={e => handleStatusChange(msg.id, e.target.value)}
                              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                            >
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                            </select>
                            <span className="text-xs text-gray-400">{timeAgo(msg.created_at)}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                            {isEditing ? (
                              <div className="space-y-2">
                                {msg.channel === 'email' && (
                                  <input
                                    value={editSubject}
                                    onChange={e => setEditSubject(e.target.value)}
                                    placeholder="Subject line"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                  />
                                )}
                                <textarea
                                  value={editBody}
                                  onChange={e => setEditBody(e.target.value)}
                                  rows={8}
                                  className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleSaveEdit(msg.id)}
                                    disabled={saving}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs text-gray-600">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {msg.subject && (
                                  <p className="text-xs text-gray-500 mb-2"><span className="font-medium">Subject:</span> {msg.subject}</p>
                                )}
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-700 whitespace-pre-line">{msg.body}</p>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
