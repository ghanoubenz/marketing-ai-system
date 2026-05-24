export type ProjectStatus = 'idea' | 'testing' | 'active' | 'paused' | 'validated' | 'archived'
export type AgentDefinitionStatus = 'active' | 'paused' | 'disabled'
export type MessageType = 'strategy' | 'content' | 'outreach' | 'reply' | 'proposal' | 'report' | 'tool_request' | 'warning' | 'blocker'
export type MessagePriority = 'low' | 'medium' | 'high' | 'urgent'
export type ApprovalLevel = 'auto_save' | 'needs_approval' | 'needs_human_action' | 'blocked'
export type MessageStatus = 'draft' | 'needs_review' | 'approved' | 'rejected' | 'edited' | 'done' | 'blocked'
export type LeadStatus = 'new' | 'researched' | 'message_drafted' | 'contacted' | 'replied' | 'interested' | 'meeting_booked' | 'proposal_needed' | 'proposal_sent' | 'won' | 'lost' | 'not_relevant'
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived'
export type ContentType = 'linkedin_post' | 'carousel' | 'one_pager' | 'video_script' | 'email' | 'landing_page_section'
export type ContentStatus = 'draft' | 'needs_review' | 'approved' | 'rejected' | 'posted'
export type OutreachChannel = 'email' | 'linkedin' | 'whatsapp' | 'call_script'
export type OutreachStatus = 'draft' | 'needs_review' | 'approved' | 'manually_sent' | 'rejected'
export type ProposalStatus = 'draft' | 'needs_review' | 'approved' | 'sent' | 'won' | 'lost'
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled'
export type ToolApprovalStatus = 'pending' | 'approved' | 'rejected' | 'deferred'

export interface DbProject {
  id: string
  user_id: string
  name: string
  description: string | null
  product_type: string | null
  target_buyer: string | null
  industry: string | null
  country_or_region: string | null
  problem_solved: string | null
  value_proposition: string | null
  price_idea: string | null
  proof_or_background: string | null
  status: ProjectStatus
  approved_offer: string | null
  approved_positioning: string | null
  approved_icp: string | null
  approved_pricing: string | null
  approved_cta: string | null
  project_memory_summary: string | null
  created_at: string
  updated_at: string
}

export interface DbAgent {
  id: string
  name: string
  role: string
  description: string | null
  system_prompt: string | null
  status: AgentDefinitionStatus
  created_at: string
  updated_at: string
}

export interface DbAgentMessage {
  id: string
  user_id: string
  project_id: string | null
  campaign_id: string | null
  agent_id: string
  lead_id: string | null
  title: string
  summary: string | null
  message_type: MessageType
  priority: MessagePriority
  approval_level: ApprovalLevel
  status: MessageStatus
  input_payload: Record<string, unknown> | null
  output_payload: Record<string, unknown> | null
  recommended_action: string | null
  requires_human: boolean
  confidence: number | null
  due_date: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  rejected_at: string | null
  edited_at: string | null
  agent?: DbAgent
  project?: DbProject
}

export interface DbActivityLog {
  id: string
  user_id: string
  project_id: string | null
  agent_id: string | null
  lead_id: string | null
  event_type: string
  event_description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface DbLead {
  id: string
  user_id: string
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
  status: LeadStatus
  last_contact_date: string | null
  next_follow_up_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DbCampaign {
  id: string
  user_id: string
  project_id: string
  name: string
  goal: string | null
  target_audience: string | null
  offer_angle: string | null
  status: CampaignStatus
  start_date: string | null
  end_date: string | null
  results_summary: string | null
  lessons_learned: string | null
  created_at: string
  updated_at: string
}

export interface DbToolRequest {
  id: string
  user_id: string
  project_id: string | null
  requested_by_agent_id: string | null
  tool_name: string
  purpose: string | null
  free_or_paid: string | null
  estimated_cost: string | null
  expected_benefit: string | null
  risk: string | null
  alternative_free_option: string | null
  urgency: string | null
  approval_status: ToolApprovalStatus
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: DbProject extends never ? never : { id: string; email: string; full_name: string | null; business_name: string | null; role: string | null; default_tone: string | null; business_description: string | null; proof_points: string[] | null; target_industries: string[] | null; preferred_pricing_style: string | null; created_at: string; updated_at: string } }
      projects: { Row: DbProject }
      agents: { Row: DbAgent }
      agent_messages: { Row: DbAgentMessage }
      activity_logs: { Row: DbActivityLog }
      leads: { Row: DbLead }
      campaigns: { Row: DbCampaign }
      tool_requests: { Row: DbToolRequest }
    }
  }
}
