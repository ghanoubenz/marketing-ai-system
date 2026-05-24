'use client'

import TopBar from '@/components/layout/TopBar'
import { leadsApi, agentsApi, projectsApi } from '@/lib/api-client'
import { timeAgo } from '@/lib/utils'
import {
  Plus, Trash2, Loader2, Inbox, ChevronDown, ChevronUp,
  Send, Building2, User, Briefcase, Globe, MapPin, Star, FileText
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface Lead {
  id: string
  project_id: string | null
  company_name: string
  contact_name: string | null
  job_title: string | null
  email: string | null
  linkedin_url: string | null
  website: string | null
  industry: string | null
  country: string | null
  lead_source: string | null
  pain_hypothesis: string | null
  personalization_note: string | null
  priority_score: number
  status: string
  last_contact_date: string | null
  next_follow_up_date: string | null
  notes: string | null
  created_at: string
  project?: { id: string; name: string }
}

interface Project {
  id: string
  name: string
}

const STATUS_OPTIONS = [
  'new', 'researched', 'message_drafted', 'contacted', 'replied',
  'interested', 'meeting_booked', 'proposal_needed', 'proposal_sent',
  'won', 'lost', 'not_relevant',
] as const

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  researched: 'bg-blue-50 text-blue-700',
  message_drafted: 'bg-indigo-50 text-indigo-700',
  contacted: 'bg-yellow-50 text-yellow-700',
  replied: 'bg-cyan-50 text-cyan-700',
  interested: 'bg-emerald-50 text-emerald-700',
  meeting_booked: 'bg-green-50 text-green-700',
  proposal_needed: 'bg-orange-50 text-orange-700',
  proposal_sent: 'bg-purple-50 text-purple-700',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-50 text-red-700',
  not_relevant: 'bg-gray-50 text-gray-500',
}

const EMPTY_FORM = {
  company_name: '', contact_name: '', job_title: '', email: '',
  website: '', industry: '', project_id: '', priority_score: '50',
  lead_source: '', pain_hypothesis: '',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [runningOutreach, setRunningOutreach] = useState<string | null>(null)
  const [runningProposal, setRunningProposal] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [leadsData, projectsData] = await Promise.all([
        leadsApi.list(),
        projectsApi.list(),
      ])
      setLeads(leadsData)
      setProjects(projectsData)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.company_name.trim()) { setError('Company name is required'); return }
    try {
      setSaving(true)
      setError(null)
      await leadsApi.create({
        company_name: form.company_name,
        contact_name: form.contact_name || null,
        job_title: form.job_title || null,
        email: form.email || null,
        website: form.website || null,
        industry: form.industry || null,
        project_id: form.project_id || null,
        priority_score: parseInt(form.priority_score) || 50,
        lead_source: form.lead_source || null,
        pain_hypothesis: form.pain_hypothesis || null,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create lead')
    } finally { setSaving(false) }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await leadsApi.update(id, { status })
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return
    try {
      await leadsApi.delete(id)
      setLeads(prev => prev.filter(l => l.id !== id))
    } catch { /* ignore */ }
  }

  const handleRunOutreach = async (lead: Lead) => {
    if (!lead.project_id) { setError('Assign a project to this lead before running outreach'); return }
    try {
      setRunningOutreach(lead.id)
      setError(null)
      await agentsApi.runOutreach(lead.project_id, {
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        job_title: lead.job_title,
        email: lead.email,
        linkedin_url: lead.linkedin_url,
        website: lead.website,
        industry: lead.industry,
        pain_hypothesis: lead.pain_hypothesis,
        personalization_note: lead.personalization_note,
      })
      setError('Outreach agent started! Check Inbox for results.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run outreach')
    } finally { setRunningOutreach(null) }
  }

  const handleRunProposal = async (lead: Lead) => {
    if (!lead.project_id) { setError('Assign a project to this lead before generating a proposal'); return }
    try {
      setRunningProposal(lead.id)
      setError(null)
      await agentsApi.runProposal(lead.project_id, lead.id)
      setError('Proposal agent started! Check Inbox for results.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run proposal')
    } finally { setRunningProposal(null) }
  }

  const priorityBadge = (score: number) => {
    if (score >= 80) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium">Hot</span>
    if (score >= 50) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 font-medium">Warm</span>
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">Cold</span>
  }

  return (
    <div>
      <TopBar title="Leads CRM" subtitle="Track and manage your sales pipeline" />
      <div className="p-6">
        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${error.includes('started!') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline text-xs">dismiss</button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">{leads.length} leads</span>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">New Lead</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input placeholder="Company name *" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="Contact name" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="Job title" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="Website" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input placeholder="Industry" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-gray-400" />
                <input type="number" min="0" max="100" placeholder="Priority (0-100)" value={form.priority_score} onChange={e => setForm(f => ({ ...f, priority_score: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1" />
              </div>
              <input placeholder="Lead source" value={form.lead_source} onChange={e => setForm(f => ({ ...f, lead_source: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <textarea placeholder="Pain hypothesis — what problem does this lead have that you can solve?" value={form.pain_hypothesis} onChange={e => setForm(f => ({ ...f, pain_hypothesis: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Create Lead'}
              </button>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-1">No leads yet</p>
            <p className="text-sm text-gray-400">Click &ldquo;Add Lead&rdquo; to start building your pipeline</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.map(lead => {
              const isExpanded = expanded === lead.id
              return (
                <div key={lead.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                  <div
                    className="p-4 cursor-pointer flex items-center justify-between gap-4"
                    onClick={() => setExpanded(isExpanded ? null : lead.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">{lead.company_name}</p>
                          {priorityBadge(lead.priority_score)}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-600'}`}>
                            {lead.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          {lead.contact_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{lead.contact_name}</span>}
                          {lead.job_title && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{lead.job_title}</span>}
                          {lead.industry && <span>{lead.industry}</span>}
                          {lead.project?.name && <span className="text-blue-600">{lead.project.name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{timeAgo(lead.created_at)}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-[10px] uppercase text-gray-400 font-medium">Status</label>
                          <select
                            value={lead.status}
                            onChange={e => handleStatusChange(lead.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                          >
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase text-gray-400 font-medium">Priority Score</label>
                          <p className="mt-1 text-sm font-medium">{lead.priority_score}/100</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                        {lead.email && <p><span className="text-gray-400 text-xs">Email:</span> <span className="text-gray-700">{lead.email}</span></p>}
                        {lead.website && <p><span className="text-gray-400 text-xs">Website:</span> <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.website}</a></p>}
                        {lead.linkedin_url && <p><span className="text-gray-400 text-xs">LinkedIn:</span> <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Profile</a></p>}
                        {lead.country && <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-400" /><span className="text-gray-700">{lead.country}</span></p>}
                        {lead.lead_source && <p><span className="text-gray-400 text-xs">Source:</span> <span className="text-gray-700">{lead.lead_source}</span></p>}
                      </div>

                      {lead.pain_hypothesis && (
                        <div className="p-2.5 bg-amber-50 rounded-lg mb-3">
                          <p className="text-xs text-amber-800"><span className="font-semibold">Pain Hypothesis:</span> {lead.pain_hypothesis}</p>
                        </div>
                      )}
                      {lead.personalization_note && (
                        <div className="p-2.5 bg-blue-50 rounded-lg mb-3">
                          <p className="text-xs text-blue-800"><span className="font-semibold">Personalization:</span> {lead.personalization_note}</p>
                        </div>
                      )}
                      {lead.notes && (
                        <div className="p-2.5 bg-gray-50 rounded-lg mb-3">
                          <p className="text-xs text-gray-700"><span className="font-semibold">Notes:</span> {lead.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={e => { e.stopPropagation(); handleRunOutreach(lead) }}
                          disabled={runningOutreach === lead.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {runningOutreach === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          {runningOutreach === lead.id ? 'Running...' : 'Run Outreach'}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleRunProposal(lead) }}
                          disabled={runningProposal === lead.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50"
                        >
                          {runningProposal === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                          {runningProposal === lead.id ? 'Running...' : 'Proposal'}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(lead.id) }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
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
