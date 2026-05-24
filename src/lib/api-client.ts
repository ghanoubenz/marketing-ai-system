const DEV_USER_ID = '00000000-0000-0000-0000-000000000001'

function getUserId(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('agd_user_id') || DEV_USER_ID
  }
  return DEV_USER_ID
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getUserId(),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `API error: ${res.status}`)
  }

  return res.json()
}

// Projects
export const projectsApi = {
  list: () => apiFetch('/api/projects'),
  get: (id: string) => apiFetch(`/api/projects/${id}`),
  create: (data: Record<string, unknown>) => apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archive: (id: string) => apiFetch(`/api/projects/${id}`, { method: 'DELETE' }),
}

// Agent Messages
export const messagesApi = {
  list: (params?: { status?: string; project_id?: string }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.project_id) qs.set('project_id', params.project_id)
    const query = qs.toString()
    return apiFetch(`/api/agent-messages${query ? `?${query}` : ''}`)
  },
  approve: (id: string) => apiFetch(`/api/agent-messages/${id}/approve`, { method: 'POST' }),
  reject: (id: string) => apiFetch(`/api/agent-messages/${id}/reject`, { method: 'POST' }),
  edit: (id: string, data: Record<string, unknown>) => apiFetch(`/api/agent-messages/${id}/edit`, { method: 'POST', body: JSON.stringify(data) }),
  markDone: (id: string) => apiFetch(`/api/agent-messages/${id}/done`, { method: 'POST' }),
}

// Content Assets
export const contentApi = {
  list: (params?: { project_id?: string; content_type?: string }) => {
    const qs = new URLSearchParams()
    if (params?.project_id) qs.set('project_id', params.project_id)
    if (params?.content_type) qs.set('content_type', params.content_type)
    const query = qs.toString()
    return apiFetch(`/api/content-assets${query ? `?${query}` : ''}`)
  },
  update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/content-assets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// Outreach Messages
export const outreachApi = {
  list: (params?: { project_id?: string; channel?: string; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.project_id) qs.set('project_id', params.project_id)
    if (params?.channel) qs.set('channel', params.channel)
    if (params?.status) qs.set('status', params.status)
    const query = qs.toString()
    return apiFetch(`/api/outreach-messages${query ? `?${query}` : ''}`)
  },
  update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/outreach-messages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// Leads
export const leadsApi = {
  list: (params?: { project_id?: string; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.project_id) qs.set('project_id', params.project_id)
    if (params?.status) qs.set('status', params.status)
    const query = qs.toString()
    return apiFetch(`/api/leads${query ? `?${query}` : ''}`)
  },
  create: (data: Record<string, unknown>) => apiFetch('/api/leads', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/api/leads/${id}`, { method: 'DELETE' }),
}

// Agents
export const agentsApi = {
  runProductStrategy: (projectId: string) =>
    apiFetch('/api/agents/product-strategy/run', { method: 'POST', body: JSON.stringify({ project_id: projectId }) }),
  runLandingPage: (projectId: string) =>
    apiFetch('/api/agents/landing-page/run', { method: 'POST', body: JSON.stringify({ project_id: projectId }) }),
  runContent: (projectId: string) =>
    apiFetch('/api/agents/content/run', { method: 'POST', body: JSON.stringify({ project_id: projectId }) }),
  runImagePrompt: (projectId: string) =>
    apiFetch('/api/agents/image-prompt/run', { method: 'POST', body: JSON.stringify({ project_id: projectId }) }),
  runOutreach: (projectId: string, lead?: Record<string, unknown>) =>
    apiFetch('/api/agents/outreach/run', { method: 'POST', body: JSON.stringify({ project_id: projectId, lead }) }),
  runLeadResearch: (projectId: string) =>
    apiFetch('/api/agents/lead-research/run', { method: 'POST', body: JSON.stringify({ project_id: projectId }) }),
  runProposal: (projectId: string, leadId?: string) =>
    apiFetch('/api/agents/proposal/run', { method: 'POST', body: JSON.stringify({ project_id: projectId, lead_id: leadId }) }),
  runCarousel: (projectId: string, angle?: string) =>
    apiFetch('/api/agents/carousel/run', { method: 'POST', body: JSON.stringify({ project_id: projectId, angle }) }),
  runCMOReview: (messageId: string) =>
    apiFetch('/api/agents/cmo-review/run', { method: 'POST', body: JSON.stringify({ message_id: messageId }) }),
  runWeeklyOps: (projectId?: string) =>
    apiFetch('/api/agents/weekly-ops/run', { method: 'POST', body: JSON.stringify({ project_id: projectId }) }),
  improve: (messageId: string, reviewMessageId?: string) =>
    apiFetch('/api/agents/improve', { method: 'POST', body: JSON.stringify({ message_id: messageId, review_message_id: reviewMessageId }) }),
  runCarouselDesign: (projectId: string, opts?: { topic?: string; generate_images?: boolean }) =>
    apiFetch('/api/agents/carousel-design/run', { method: 'POST', body: JSON.stringify({ project_id: projectId, ...opts }) }),
  generateCarouselImages: (messageId: string, slideNumbers?: number[]) =>
    apiFetch('/api/agents/carousel-design/generate-images', { method: 'POST', body: JSON.stringify({ message_id: messageId, slide_numbers: slideNumbers }) }),
  sendToAgent: (messageId: string, targetAgent: string) =>
    apiFetch('/api/agents/send-to', { method: 'POST', body: JSON.stringify({ message_id: messageId, target_agent: targetAgent }) }),
  runPipeline: (projectId: string, startAgent?: string) =>
    apiFetch('/api/agents/pipeline/run', { method: 'POST', body: JSON.stringify({ project_id: projectId, start_agent: startAgent }) }),
  runResearch: (projectId: string, query: string) =>
    apiFetch('/api/agents/research/run', { method: 'POST', body: JSON.stringify({ project_id: projectId, query }) }),
}

// Proposals
export const proposalsApi = {
  list: (params?: { project_id?: string; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.project_id) qs.set('project_id', params.project_id)
    if (params?.status) qs.set('status', params.status)
    const query = qs.toString()
    return apiFetch(`/api/proposals${query ? `?${query}` : ''}`)
  },
  update: (id: string, data: Record<string, unknown>) => apiFetch(`/api/proposals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// Workflows
export const workflowsApi = {
  list: () => apiFetch('/api/workflows'),
  create: (data: { name: string; description?: string; project_id?: string; steps: Array<Record<string, unknown>> }) =>
    apiFetch('/api/workflows', { method: 'POST', body: JSON.stringify(data) }),
  run: (id: string) => apiFetch(`/api/workflows/${id}/run`, { method: 'POST' }),
}
