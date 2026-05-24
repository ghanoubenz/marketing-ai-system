'use client'

import TopBar from '@/components/layout/TopBar'
import { contentApi } from '@/lib/api-client'
import { timeAgo } from '@/lib/utils'
import { FileText, Image, PenTool, Loader2, Inbox, ChevronDown, ChevronUp, Copy, Check, Edit3, Save } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface ContentAsset {
  id: string
  content_type: string
  title: string
  body: string
  cta: string | null
  status: string
  created_at: string
  project?: { id: string; name: string }
  agent?: { id: string; name: string }
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  linkedin_post: { label: 'LinkedIn Post', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: PenTool },
  landing_page_section: { label: 'Landing Page', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FileText },
  image_prompt: { label: 'Image Prompts', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Image },
  carousel: { label: 'Carousel', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: FileText },
  one_pager: { label: 'One-Pager', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: FileText },
  content_calendar: { label: 'Calendar', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: FileText },
}

const STATUS_OPTIONS = ['draft', 'needs_review', 'approved', 'posted'] as const
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  needs_review: 'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  posted: 'bg-blue-50 text-blue-700',
}

export default function ContentPage() {
  const [assets, setAssets] = useState<ContentAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await contentApi.list(filter === 'all' ? undefined : { content_type: filter })
      setAssets(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleCopy = async (asset: ContentAsset) => {
    let textToCopy = ''
    try {
      const parsed = JSON.parse(asset.body)
      if (parsed.linkedin_posts) {
        textToCopy = parsed.linkedin_posts.map((p: { text: string }) => p.text).join('\n\n---\n\n')
      } else if (parsed.hero) {
        textToCopy = `${parsed.hero.headline}\n${parsed.hero.subheadline}\n\n${parsed.hero.primary_cta}`
      } else {
        textToCopy = JSON.stringify(parsed, null, 2)
      }
    } catch {
      textToCopy = asset.body
    }
    await navigator.clipboard.writeText(textToCopy)
    setCopied(asset.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await contentApi.update(id, { status })
      setAssets(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    } catch { /* ignore */ }
  }

  const handleSaveEdit = async (id: string) => {
    setSaving(true)
    try {
      await contentApi.update(id, { body: editBody })
      setAssets(prev => prev.map(a => a.id === id ? { ...a, body: editBody } : a))
      setEditing(null)
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  const types = ['all', 'linkedin_post', 'landing_page_section', 'image_prompt', 'carousel']

  // Group by project
  const grouped = assets.reduce<Record<string, ContentAsset[]>>((acc, a) => {
    const key = a.project?.name || 'No Project'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div>
      <TopBar title="Content Library" subtitle="All content from your AI agents — copy, edit, and publish" />
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'all' ? 'All' : TYPE_CONFIG[t]?.label || t}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">{assets.length} assets</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading content...
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">No content assets yet</p>
            <p className="text-sm text-gray-400">Run and approve an agent from the Projects page</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([projectName, items]) => (
              <div key={projectName}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">{projectName}</h3>
                <div className="space-y-3">
                  {items.map(asset => {
                    const config = TYPE_CONFIG[asset.content_type] || { label: asset.content_type, color: 'bg-gray-50 text-gray-700 border-gray-200', icon: FileText }
                    const Icon = config.icon
                    const isExpanded = expanded === asset.id
                    const isEditing = editing === asset.id

                    let bodyPreview: string | null = null
                    try {
                      const parsed = JSON.parse(asset.body)
                      if (parsed.linkedin_posts) bodyPreview = `${parsed.linkedin_posts.length} posts`
                      else if (parsed.image_prompts) bodyPreview = `${parsed.image_prompts.length} prompts`
                      else if (parsed.hero) bodyPreview = parsed.hero.headline || 'Landing page copy'
                      else if (parsed.slides) bodyPreview = `${parsed.slides.length} slides`
                    } catch {
                      bodyPreview = asset.body?.substring(0, 80) || null
                    }

                    return (
                      <div key={asset.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                        <div className="p-4 flex items-start justify-between gap-4">
                          <div
                            className="flex items-start gap-3 flex-1 cursor-pointer"
                            onClick={() => setExpanded(isExpanded ? null : asset.id)}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">{asset.title}</p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${config.color}`}>{config.label}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[asset.status] || 'bg-gray-100 text-gray-600'}`}>
                                  {asset.status}
                                </span>
                              </div>
                              {bodyPreview && <p className="text-xs text-gray-500">{bodyPreview}</p>}
                              <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                <span>{timeAgo(asset.created_at)}</span>
                                {asset.agent?.name && <span>by {asset.agent.name}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleCopy(asset)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
                              title="Copy content"
                            >
                              {copied === asset.id ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                              {copied === asset.id ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              onClick={() => { setEditing(asset.id); setEditBody(asset.body); setExpanded(asset.id) }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
                              title="Edit content"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            <select
                              value={asset.status}
                              onChange={e => handleStatusChange(asset.id, e.target.value)}
                              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                            >
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                            {asset.cta && (
                              <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                                <p className="text-xs text-blue-700"><span className="font-semibold">CTA:</span> {asset.cta}</p>
                              </div>
                            )}

                            {isEditing ? (
                              <div>
                                <textarea
                                  value={editBody}
                                  onChange={e => setEditBody(e.target.value)}
                                  rows={12}
                                  className="w-full p-3 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleSaveEdit(asset.id)}
                                    disabled={saving}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 bg-gray-50 rounded-lg overflow-auto max-h-[400px]">
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                                  {(() => { try { return JSON.stringify(JSON.parse(asset.body), null, 2) } catch { return asset.body } })()}
                                </pre>
                              </div>
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
