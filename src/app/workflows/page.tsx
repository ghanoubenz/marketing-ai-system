'use client'

import TopBar from '@/components/layout/TopBar'
import { projectsApi, workflowsApi } from '@/lib/api-client'
import { useState, useEffect, useCallback } from 'react'
import {
  Play, Plus, Trash2, ArrowDown, CheckCircle, XCircle, Loader2,
  Zap, Shield, RefreshCw, Search, ChevronDown, GripVertical, Rocket
} from 'lucide-react'

interface WorkflowStep {
  agent: string
  label: string
  icon: string
  auto_cmo: boolean
  auto_improve: boolean
  auto_research: string
}

interface SavedWorkflow {
  id: string
  name: string
  description: string | null
  project_id: string | null
  steps: WorkflowStep[]
  status: string
  current_step: number
  results: Array<{
    step: number
    agent: string
    status: string
    message_id?: string
    error?: string
    sub_steps?: Array<{ agent: string; status: string; message_id?: string }>
  }>
  project?: { id: string; name: string }
  created_at: string
  completed_at: string | null
}

const AVAILABLE_AGENTS = [
  { slug: 'product-strategy', label: 'Product Strategy', icon: '🎯', category: 'strategy' },
  { slug: 'lead-research', label: 'Lead Research', icon: '🔍', category: 'research' },
  { slug: 'content', label: 'Content Writer', icon: '📝', category: 'content' },
  { slug: 'outreach', label: 'Outreach', icon: '📧', category: 'outreach' },
  { slug: 'landing-page', label: 'Landing Page', icon: '🌐', category: 'content' },
  { slug: 'carousel-design', label: 'Carousel Design', icon: '🎨', category: 'content' },
  { slug: 'proposal', label: 'Proposal Writer', icon: '📋', category: 'sales' },
  { slug: 'image-prompt', label: 'Image Prompt', icon: '🖼️', category: 'content' },
  { slug: 'weekly-ops', label: 'Weekly Ops', icon: '📊', category: 'ops' },
  { slug: 'research', label: 'Research & Learn', icon: '🧠', category: 'research' },
]

const PRESET_WORKFLOWS = [
  {
    name: 'Full Revenue Pipeline',
    description: 'Strategy → CMO → Improve → Content + Outreach + Landing Page → CMO Review each',
    steps: [
      { agent: 'product-strategy', label: 'Product Strategy', icon: '🎯', auto_cmo: true, auto_improve: true, auto_research: '' },
      { agent: 'content', label: 'Content Writer', icon: '📝', auto_cmo: true, auto_improve: true, auto_research: '' },
      { agent: 'outreach', label: 'Outreach', icon: '📧', auto_cmo: true, auto_improve: true, auto_research: '' },
      { agent: 'landing-page', label: 'Landing Page', icon: '🌐', auto_cmo: true, auto_improve: true, auto_research: '' },
      { agent: 'lead-research', label: 'Lead Research', icon: '🔍', auto_cmo: false, auto_improve: false, auto_research: '' },
    ],
  },
  {
    name: 'Content Blitz',
    description: 'Research → Strategy → 3x Content types with CMO review',
    steps: [
      { agent: 'product-strategy', label: 'Product Strategy', icon: '🎯', auto_cmo: true, auto_improve: true, auto_research: '' },
      { agent: 'content', label: 'Content Writer', icon: '📝', auto_cmo: true, auto_improve: true, auto_research: 'LinkedIn content best practices B2B 2026' },
      { agent: 'carousel-design', label: 'Carousel Design', icon: '🎨', auto_cmo: true, auto_improve: false, auto_research: '' },
      { agent: 'image-prompt', label: 'Image Prompt', icon: '🖼️', auto_cmo: false, auto_improve: false, auto_research: '' },
    ],
  },
  {
    name: 'Outbound Campaign',
    description: 'Strategy → Lead Research → Outreach sequences → Proposal template',
    steps: [
      { agent: 'product-strategy', label: 'Product Strategy', icon: '🎯', auto_cmo: true, auto_improve: true, auto_research: '' },
      { agent: 'lead-research', label: 'Lead Research', icon: '🔍', auto_cmo: false, auto_improve: false, auto_research: 'B2B lead generation ICP targeting' },
      { agent: 'outreach', label: 'Outreach', icon: '📧', auto_cmo: true, auto_improve: true, auto_research: 'cold email best practices reply rates 2026' },
      { agent: 'proposal', label: 'Proposal Writer', icon: '📋', auto_cmo: true, auto_improve: false, auto_research: '' },
    ],
  },
]

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Builder state
  const [building, setBuilding] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDesc, setWorkflowDesc] = useState('')
  const [selectedProject, setSelectedProject] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [wf, proj] = await Promise.all([workflowsApi.list(), projectsApi.list()])
      setWorkflows(wf)
      setProjects(proj)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const addStep = (agent: typeof AVAILABLE_AGENTS[0]) => {
    setSteps([...steps, {
      agent: agent.slug,
      label: agent.label,
      icon: agent.icon,
      auto_cmo: false,
      auto_improve: false,
      auto_research: '',
    }])
    setShowAgentPicker(false)
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const toggleStepOption = (index: number, field: 'auto_cmo' | 'auto_improve') => {
    const updated = [...steps]
    updated[index] = { ...updated[index], [field]: !updated[index][field] }
    if (field === 'auto_cmo' && !updated[index].auto_cmo) {
      updated[index].auto_improve = false
    }
    setSteps(updated)
  }

  const setStepResearch = (index: number, query: string) => {
    const updated = [...steps]
    updated[index] = { ...updated[index], auto_research: query }
    setSteps(updated)
  }

  const loadPreset = (preset: typeof PRESET_WORKFLOWS[0]) => {
    setWorkflowName(preset.name)
    setWorkflowDesc(preset.description)
    setSteps(preset.steps)
    setBuilding(true)
  }

  const saveWorkflow = async () => {
    if (!workflowName || steps.length === 0 || !selectedProject) {
      setError('Name, project, and at least one step are required')
      return
    }
    setSaving(true)
    try {
      await workflowsApi.create({
        name: workflowName,
        description: workflowDesc,
        project_id: selectedProject,
        steps: steps as unknown as Array<Record<string, unknown>>,
      })
      setBuilding(false)
      setWorkflowName('')
      setWorkflowDesc('')
      setSteps([])
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const runWorkflow = async (id: string) => {
    setRunningId(id)
    setError(null)
    try {
      await workflowsApi.run(id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workflow failed')
    } finally {
      setRunningId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'running': return 'bg-blue-100 text-blue-700'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div>
      <TopBar title="Workflows" subtitle="Chain agents into automated campaigns" />
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 font-medium">Dismiss</button>
          </div>
        )}

        {/* Preset Templates */}
        {!building && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Start — Preset Workflows</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PRESET_WORKFLOWS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => loadPreset(preset)}
                  className="text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">{preset.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{preset.description}</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {preset.steps.map((s, j) => (
                      <span key={j} className="text-xs bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
                        {s.icon} {s.label}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Builder */}
        {building ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Build Workflow</h2>
              <button
                onClick={() => { setBuilding(false); setSteps([]) }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Workflow Name</label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={e => setWorkflowName(e.target.value)}
                  placeholder="e.g. Full Revenue Pipeline"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={workflowDesc}
                onChange={e => setWorkflowDesc(e.target.value)}
                placeholder="What this workflow does..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-6"
              />
            </div>

            {/* Pipeline visualization */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Pipeline Steps</h3>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-1 text-gray-300">
                        <GripVertical className="w-4 h-4" />
                        <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                      </div>
                      <span className="text-lg">{step.icon}</span>
                      <span className="font-medium text-sm text-gray-900 flex-1">{step.label}</span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStepOption(i, 'auto_cmo')}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            step.auto_cmo ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title="Auto CMO Review after this step"
                        >
                          <Shield className="w-3 h-3" /> CMO
                        </button>
                        <button
                          onClick={() => toggleStepOption(i, 'auto_improve')}
                          disabled={!step.auto_cmo}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            step.auto_improve ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          } ${!step.auto_cmo ? 'opacity-30 cursor-not-allowed' : ''}`}
                          title="Auto improve based on CMO feedback"
                        >
                          <RefreshCw className="w-3 h-3" /> Fix
                        </button>
                        <button
                          onClick={() => {
                            const query = step.auto_research
                              ? ''
                              : prompt('What should the Research Agent learn? (e.g. "cold email best practices 2026")') || ''
                            setStepResearch(i, query)
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            step.auto_research ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title="Research & learn before this step"
                        >
                          <Search className="w-3 h-3" /> Learn
                        </button>
                        <button
                          onClick={() => removeStep(i)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {step.auto_research && (
                      <div className="ml-10 mt-1 px-3 py-1.5 bg-indigo-50 rounded text-xs text-indigo-600">
                        Research: &quot;{step.auto_research}&quot;
                      </div>
                    )}

                    {i < steps.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Add step button */}
                <div className="relative">
                  <button
                    onClick={() => setShowAgentPicker(!showAgentPicker)}
                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:text-blue-500 hover:border-blue-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Agent Step
                  </button>

                  {showAgentPicker && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 grid grid-cols-2 gap-1">
                      {AVAILABLE_AGENTS.map(agent => (
                        <button
                          key={agent.slug}
                          onClick={() => addStep(agent)}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-blue-50 transition-colors text-left"
                        >
                          <span>{agent.icon}</span>
                          <span className="text-gray-700">{agent.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={saveWorkflow}
                disabled={saving || !workflowName || steps.length === 0 || !selectedProject}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Save Workflow
              </button>
              <span className="text-xs text-gray-400">
                {steps.length} steps {steps.filter(s => s.auto_cmo).length > 0 && `• ${steps.filter(s => s.auto_cmo).length} with CMO review`}
                {steps.filter(s => s.auto_improve).length > 0 && ` • ${steps.filter(s => s.auto_improve).length} auto-improve`}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setBuilding(true)}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Build Custom Workflow
          </button>
        )}

        {/* Saved Workflows */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Your Workflows</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <Zap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No workflows yet</p>
              <p className="text-gray-400 text-xs mt-1">Use a preset above or build a custom workflow</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map(wf => (
                <div key={wf.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{wf.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(wf.status)}`}>
                          {wf.status}
                        </span>
                      </div>
                      {wf.description && <p className="text-xs text-gray-500 mb-1">{wf.description}</p>}
                      {wf.project && (
                        <p className="text-xs text-gray-400">Project: {wf.project.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(wf.status === 'draft' || wf.status === 'completed' || wf.status === 'failed') && (
                        <button
                          onClick={() => runWorkflow(wf.id)}
                          disabled={runningId === wf.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {runningId === wf.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                          {wf.status === 'completed' || wf.status === 'failed' ? 'Re-run' : 'Run'}
                        </button>
                      )}
                      {wf.status === 'running' && (
                        <span className="flex items-center gap-1.5 px-4 py-2 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pipeline visualization */}
                  <div className="flex items-center gap-1 flex-wrap mb-3">
                    {(wf.steps as WorkflowStep[]).map((step, i) => {
                      const result = wf.results?.[i]
                      const isSuccess = result?.status === 'success'
                      const isFailed = result?.status === 'failed'
                      const isCurrent = wf.status === 'running' && wf.current_step === i

                      return (
                        <div key={i} className="flex items-center gap-1">
                          <div
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              isSuccess
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : isFailed
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : isCurrent
                                ? 'bg-blue-50 border-blue-300 text-blue-700 animate-pulse'
                                : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                          >
                            <span>{step.icon}</span>
                            <span>{step.label}</span>
                            {step.auto_cmo && <Shield className="w-3 h-3 text-amber-500" />}
                            {step.auto_improve && <RefreshCw className="w-3 h-3 text-purple-500" />}
                            {step.auto_research && <Search className="w-3 h-3 text-indigo-500" />}
                            {isSuccess && <CheckCircle className="w-3 h-3 text-green-500" />}
                            {isFailed && <XCircle className="w-3 h-3 text-red-500" />}
                            {isCurrent && <Loader2 className="w-3 h-3 animate-spin" />}
                          </div>
                          {i < (wf.steps as WorkflowStep[]).length - 1 && (
                            <ArrowDown className="w-3 h-3 text-gray-300 rotate-[-90deg]" />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Results detail */}
                  {wf.results && wf.results.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Results</h4>
                      <div className="space-y-1.5">
                        {wf.results.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              r.status === 'success' ? 'bg-green-500' : r.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                            }`} />
                            <span className="text-gray-700 font-medium">{r.agent}</span>
                            <span className={r.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                              {r.status}
                            </span>
                            {r.error && <span className="text-red-400">— {r.error}</span>}
                            {r.sub_steps && r.sub_steps.length > 0 && (
                              <span className="text-gray-400">
                                ({r.sub_steps.map(s => `${s.agent}: ${s.status}`).join(', ')})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
