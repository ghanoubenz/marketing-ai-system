import { Lead, Project, ContentAsset, Proposal, WeeklyReport } from './types';

export const portfolioDataNotice = 'This is dummy sample data created for portfolio demonstration only. No real client, company, tender, or operational data is included.';

export const mockLeads: Lead[] = [];
export const mockProjects: Project[] = [];
export const mockContentAssets: ContentAsset[] = [];
export const mockProposals: Proposal[] = [];

export const mockReport: WeeklyReport = {
  id: 'demo-empty-report',
  period: 'Demo period',
  leads_added: 0,
  leads_contacted: 0,
  replies: 0,
  interested: 0,
  calls_booked: 0,
  proposals_sent: 0,
  clients_won: 0,
  best_message: 'No real message data is included in this portfolio version.',
  best_offer: 'No real offer data is included in this portfolio version.',
  blockers: [],
  next_actions: [],
  created_at: new Date().toISOString(),
};
