'use client'

import TopBar from '@/components/layout/TopBar'
import StatusBadge from '@/components/ui/StatusBadge'
import { projectsApi, agentsApi } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import type { DbProject } from '@/lib/supabase/types'
import { Plus, Play, Loader2, Archive, ChevronDown, ChevronUp, Sparkles, FileText, PenTool, ImageIcon, Send, Search, Layout } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

const EMPTY_FORM = {
  name: '', description: '', product_type: '', target_buyer: '',
  industry: '', country_or_region: '', problem_solved: '',
  value_proposition: '', price_idea: '', proof_or_background: '',
}

export default function ProductsPage() {
  const [projects, setProjects] = useState<DbProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [runningAgent, setRunningAgent] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      const data = await projectsApi.list()
      setProjects(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProjects() }, [loadProjects])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await projectsApi.create(form)
      setForm(EMPTY_FORM)
      setShowForm(false)
      await loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  const [runningLanding, setRunningLanding] = useState<string | null>(null)

  const handleRunStrategy = async (projectId: string) => {
    setRunningAgent(projectId)
    setError(null)
    try {
      await agentsApi.runProductStrategy(projectId)
      setError(null)
      setError('Product Strategy Agent completed! Check Agent Inbox for the output.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed')
    } finally {
      setRunningAgent(null)
    }
  }

  const [runningOther, setRunningOther] = useState<string | null>(null)

  const handleRunLandingPage = async (projectId: string) => {
    setRunningLanding(projectId)
    setError(null)
    try {
      await agentsApi.runLandingPage(projectId)
      setError(null)
      setError('Landing Page Agent completed! Check Agent Inbox for the output.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed')
    } finally {
      setRunningLanding(null)
    }
  }

  const handleRunAgent = async (projectId: string, agentKey: string, agentLabel: string) => {
    setRunningOther(`${projectId}-${agentKey}`)
    setError(null)
    try {
      if (agentKey === 'content') await agentsApi.runContent(projectId)
      else if (agentKey === 'image-prompt') await agentsApi.runImagePrompt(projectId)
      else if (agentKey === 'outreach') await agentsApi.runOutreach(projectId)
      else if (agentKey === 'lead-research') await agentsApi.runLeadResearch(projectId)
      else if (agentKey === 'proposal') await agentsApi.runProposal(projectId)
      else if (agentKey === 'carousel-design') await agentsApi.runCarouselDesign(projectId)
      setError(`${agentLabel} completed! Check Agent Inbox for the output.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed')
    } finally {
      setRunningOther(null)
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm('Archive this project?')) return
    try {
      await projectsApi.archive(id)
      await loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive')
    }
  }

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
  }

  return (
    <div>
      <TopBar title="Projects & Offers" subtitle="Manage your products and service offers" />
      <div className="p-6">
        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${error.includes('completed!') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {error}
            <button onClick={() => setError(null)} className={`ml-2 font-medium ${error.includes('completed!') ? 'text-green-500' : 'text-red-500 hover:text-red-700'}`}>Dismiss</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm text-gray-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Create New Project</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                <input type="text" value={form.name} onChange={updateField('name')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Website Growth Audit" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Idea</label>
                <input type="text" value={form.price_idea} onChange={updateField('price_idea')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. $199 pilot, $497 standard" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={updateField('description')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="What does this product/service do?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Buyer</label>
                <input type="text" value={form.target_buyer} onChange={updateField('target_buyer')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Who buys this?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input type="text" value={form.industry} onChange={updateField('industry')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. B2B SaaS, Industrial, Agency" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Problem Solved</label>
                <input type="text" value={form.problem_solved} onChange={updateField('problem_solved')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What pain does it solve?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <input type="text" value={form.country_or_region} onChange={updateField('country_or_region')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. UAE / MENA / Global" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Proof / Background</label>
                <textarea value={form.proof_or_background} onChange={updateField('proof_or_background')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} placeholder="Your experience, credentials, past results relevant to this offer" />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <button
                  onClick={handleCreate}
                  disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Project'}
                </button>
                <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-2">No projects yet</p>
            <p className="text-sm text-gray-400">Create your first project to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map(project => (
              <div key={project.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => setExpanded(expanded === project.id ? null : project.id)}>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        <StatusBadge status={project.status} />
                        {expanded === project.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                      {project.description && <p className="text-sm text-gray-600 mb-2">{project.description}</p>}
                      {project.approved_offer && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-2">
                          <p className="text-sm text-green-800 font-medium">{project.approved_offer}</p>
                          <p className="text-xs text-green-600 mt-1">Approved offer</p>
                        </div>
                      )}
                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        {project.target_buyer && <span>Target: {project.target_buyer}</span>}
                        {project.price_idea && <span>Price: {project.price_idea}</span>}
                        <span>Updated: {formatDate(project.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-4 flex-wrap justify-end">
                      <button
                        onClick={() => handleRunStrategy(project.id)}
                        disabled={runningAgent === project.id}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {runningAgent === project.id ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Running...</>
                        ) : (
                          <><Sparkles className="w-3 h-3" /> Strategy</>
                        )}
                      </button>
                      {project.approved_offer ? (
                        <>
                          <button
                            onClick={() => handleRunLandingPage(project.id)}
                            disabled={runningLanding === project.id}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            {runningLanding === project.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Landing Page
                          </button>
                          <button
                            onClick={() => handleRunAgent(project.id, 'content', 'Content Agent')}
                            disabled={runningOther === `${project.id}-content`}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                          >
                            {runningOther === `${project.id}-content` ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenTool className="w-3 h-3" />} Content
                          </button>
                          <button
                            onClick={() => handleRunAgent(project.id, 'image-prompt', 'Image Prompt Agent')}
                            disabled={runningOther === `${project.id}-image-prompt`}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          >
                            {runningOther === `${project.id}-image-prompt` ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} Images
                          </button>
                          <button
                            onClick={() => handleRunAgent(project.id, 'outreach', 'Outreach Agent')}
                            disabled={runningOther === `${project.id}-outreach`}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                          >
                            {runningOther === `${project.id}-outreach` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Outreach
                          </button>
                          <button
                            onClick={() => handleRunAgent(project.id, 'lead-research', 'Lead Research Agent')}
                            disabled={runningOther === `${project.id}-lead-research`}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
                          >
                            {runningOther === `${project.id}-lead-research` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} Lead Research
                          </button>
                          <button
                            onClick={() => handleRunAgent(project.id, 'proposal', 'Proposal Agent')}
                            disabled={runningOther === `${project.id}-proposal`}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                          >
                            {runningOther === `${project.id}-proposal` ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Proposal
                          </button>
                          <button
                            onClick={() => handleRunAgent(project.id, 'carousel-design', 'Carousel Design Agent')}
                            disabled={runningOther === `${project.id}-carousel-design`}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                          >
                            {runningOther === `${project.id}-carousel-design` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layout className="w-3 h-3" />} Carousel
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Approve strategy to unlock agents</span>
                      )}
                      <button
                        onClick={() => handleArchive(project.id)}
                        className="flex items-center justify-center p-2 border border-gray-200 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                        title="Archive project"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {expanded === project.id && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium text-gray-500">Industry:</span> <span className="text-gray-700">{project.industry || '—'}</span></div>
                    <div><span className="font-medium text-gray-500">Region:</span> <span className="text-gray-700">{project.country_or_region || '—'}</span></div>
                    <div className="col-span-2"><span className="font-medium text-gray-500">Problem:</span> <span className="text-gray-700">{project.problem_solved || '—'}</span></div>
                    <div className="col-span-2"><span className="font-medium text-gray-500">Proof:</span> <span className="text-gray-700">{project.proof_or_background || '—'}</span></div>
                    {project.approved_cta && <div className="col-span-2"><span className="font-medium text-gray-500">CTA:</span> <span className="text-gray-700">{project.approved_cta}</span></div>}
                    {project.project_memory_summary && (
                      <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 mb-1">Project Memory</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{project.project_memory_summary}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
