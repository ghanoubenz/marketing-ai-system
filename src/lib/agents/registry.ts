import type { AIProvider } from '@/lib/ai/model-router'

export interface AgentDefinition {
  key: string
  name: string
  status: 'active' | 'disabled'
  preferredProvider: AIProvider
  messageType: string
  approvalTarget: 'project' | 'content_assets' | 'outreach_messages' | 'proposals' | 'leads' | 'reports' | 'none'
  requiresApprovedOffer: boolean
  requiresLead: boolean
}

export const AGENT_REGISTRY: Record<string, AgentDefinition> = {
  'product-strategy': {
    key: 'product-strategy',
    name: 'Product Strategy Agent',
    status: 'active',
    preferredProvider: 'anthropic',
    messageType: 'strategy',
    approvalTarget: 'project',
    requiresApprovedOffer: false,
    requiresLead: false,
  },
  'landing-page': {
    key: 'landing-page',
    name: 'Landing Page Agent',
    status: 'active',
    preferredProvider: 'anthropic',
    messageType: 'content',
    approvalTarget: 'content_assets',
    requiresApprovedOffer: true,
    requiresLead: false,
  },
  'content': {
    key: 'content',
    name: 'Content Agent',
    status: 'active',
    preferredProvider: 'anthropic',
    messageType: 'content',
    approvalTarget: 'content_assets',
    requiresApprovedOffer: true,
    requiresLead: false,
  },
  'image-prompt': {
    key: 'image-prompt',
    name: 'Image Prompt Agent',
    status: 'active',
    preferredProvider: 'anthropic',
    messageType: 'content',
    approvalTarget: 'content_assets',
    requiresApprovedOffer: true,
    requiresLead: false,
  },
  'outreach': {
    key: 'outreach',
    name: 'Outreach Agent',
    status: 'active',
    preferredProvider: 'anthropic',
    messageType: 'outreach',
    approvalTarget: 'outreach_messages',
    requiresApprovedOffer: true,
    requiresLead: false,
  },
}
