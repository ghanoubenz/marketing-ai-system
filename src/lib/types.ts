export type ProductStatus = 'idea' | 'testing' | 'active' | 'paused' | 'validated'
export type AgentStatus = 'idle' | 'working' | 'waiting_approval' | 'blocked'
export type MessagePriority = 'low' | 'medium' | 'high' | 'urgent'
export type MessageStatus = 'pending' | 'approved' | 'rejected' | 'edited' | 'done'
export type LeadStatus =
  | 'new' | 'researched' | 'message_drafted' | 'contacted'
  | 'replied' | 'interested' | 'meeting_booked' | 'proposal_needed'
  | 'proposal_sent' | 'won' | 'lost' | 'not_relevant'
export type ContentType = 'linkedin_post' | 'carousel' | 'one_pager' | 'video_script'
export type ContentStatus = 'draft' | 'needs_review' | 'approved' | 'posted'
export type OutreachChannel = 'email' | 'linkedin' | 'whatsapp' | 'call'
export type OutreachStatus = 'draft' | 'approved' | 'sent' | 'replied'
export type ProposalStatus = 'draft' | 'needs_review' | 'approved' | 'sent'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'

export interface Product {
  id: string
  name: string
  description: string
  target_audience: string
  problem_solved: string
  price_range: string
  status: ProductStatus
  offer_statement: string
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  name: string
  role: string
  description: string
  status: AgentStatus
  last_action: string
  last_run_at: string
  icon: string
}

export interface AgentMessage {
  id: string
  agent_id: string
  agent_name: string
  product_id?: string
  product_name?: string
  lead_id?: string
  lead_name?: string
  message: string
  priority: MessagePriority
  status: MessageStatus
  requires_human: boolean
  recommended_action: string
  created_at: string
}

export interface Lead {
  id: string
  company_name: string
  contact_name: string
  job_title: string
  email: string
  linkedin_url: string
  website: string
  industry: string
  country: string
  product_id?: string
  status: LeadStatus
  priority_score: number
  last_contact_date: string
  next_followup_date: string
  notes: string
  agent_recommendation: string
}

export interface ContentAsset {
  id: string
  product_id: string
  product_name: string
  type: ContentType
  title: string
  body: string
  cta: string
  status: ContentStatus
  publish_date: string
  created_at: string
}

export interface OutreachMessage {
  id: string
  lead_id: string
  lead_name: string
  product_id: string
  channel: OutreachChannel
  sequence_number: number
  subject: string
  body: string
  status: OutreachStatus
  created_at: string
}

export interface Proposal {
  id: string
  lead_id: string
  lead_name: string
  product_id: string
  product_name: string
  title: string
  executive_summary: string
  pricing: string
  status: ProposalStatus
  created_at: string
}

export interface Task {
  id: string
  agent_name?: string
  product_name?: string
  lead_name?: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  due_date: string
}

export interface WeeklyReport {
  id: string
  period: string
  leads_added: number
  leads_contacted: number
  replies: number
  interested: number
  calls_booked: number
  proposals_sent: number
  clients_won: number
  best_message: string
  best_offer: string
  blockers: string[]
  next_actions: string[]
  created_at: string
}
