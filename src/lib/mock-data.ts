import type {
  Product, Agent, AgentMessage, Lead, ContentAsset,
  OutreachMessage, Proposal, Task, WeeklyReport
} from './types'

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'AI Website Audit Tool',
    description: 'Automated website audit that checks SEO, performance, accessibility, and gives actionable recommendations using AI.',
    target_audience: 'Small business owners and marketing managers',
    problem_solved: 'Manual website audits take hours and require expertise most small businesses lack.',
    price_range: '$49-199/month',
    status: 'active',
    offer_statement: 'Get a complete AI-powered website audit in 5 minutes — with a prioritized action plan to fix what matters most.',
    created_at: '2026-04-15',
    updated_at: '2026-05-08',
  },
  {
    id: '2',
    name: 'Proposal Builder Pro',
    description: 'AI-powered proposal generator for freelancers and agencies. Enter client info, get a polished proposal in minutes.',
    target_audience: 'Freelancers, consultants, small agencies',
    problem_solved: 'Writing proposals takes 2-4 hours per client. Most freelancers skip it and lose deals.',
    price_range: '$29-99/month',
    status: 'testing',
    offer_statement: 'Stop losing deals to bad proposals. Generate client-winning proposals in under 10 minutes.',
    created_at: '2026-05-01',
    updated_at: '2026-05-07',
  },
  {
    id: '3',
    name: 'LinkedIn Ghostwriter',
    description: 'AI agent that drafts LinkedIn posts based on your expertise, voice, and sales goals.',
    target_audience: 'B2B founders, consultants, coaches',
    problem_solved: 'Posting consistently on LinkedIn is hard when you are busy delivering client work.',
    price_range: '$39-149/month',
    status: 'idea',
    offer_statement: 'Your LinkedIn, on autopilot. AI-drafted posts that sound like you and drive inbound leads.',
    created_at: '2026-05-05',
    updated_at: '2026-05-05',
  },
]

export const mockAgents: Agent[] = [
  { id: '1', name: 'Product Strategy Agent', role: 'Turns ideas into clear offers', description: 'Analyzes product ideas and generates positioning, pricing, objections, and differentiation.', status: 'idle', last_action: 'Generated offer for Proposal Builder Pro', last_run_at: '2026-05-07', icon: 'Lightbulb' },
  { id: '2', name: 'ICP & Market Research Agent', role: 'Finds best customers', description: 'Creates ideal customer profiles, buyer personas, and market segments.', status: 'idle', last_action: 'Created ICP for AI Website Audit Tool', last_run_at: '2026-05-06', icon: 'Target' },
  { id: '3', name: 'Landing Page Agent', role: 'Creates landing page copy', description: 'Generates complete landing page copy with hero, CTA, FAQ, and structure.', status: 'waiting_approval', last_action: 'Drafted landing page for AI Website Audit Tool', last_run_at: '2026-05-08', icon: 'Layout' },
  { id: '4', name: 'Content Agent', role: 'Creates sales-focused content', description: 'Writes LinkedIn posts, carousel outlines, scripts tied to active offers.', status: 'working', last_action: 'Generating 10 LinkedIn posts for AI Website Audit Tool', last_run_at: '2026-05-09', icon: 'PenTool' },
  { id: '5', name: 'Carousel / One-Pager Agent', role: 'Creates visual content outlines', description: 'Structures carousel slides and one-pager PDFs for LinkedIn and lead gen.', status: 'idle', last_action: 'Created carousel outline: "5 Website Mistakes"', last_run_at: '2026-05-05', icon: 'Layers' },
  { id: '6', name: 'Lead Research Agent', role: 'Builds lead lists', description: 'Suggests lead sources, search queries, qualification rules, and personalization notes.', status: 'idle', last_action: 'Scored 30 leads for AI Website Audit Tool', last_run_at: '2026-05-04', icon: 'Search' },
  { id: '7', name: 'Outreach Agent', role: 'Drafts outreach messages', description: 'Creates personalized email sequences, LinkedIn messages, and call scripts.', status: 'waiting_approval', last_action: 'Drafted outreach for 12 leads', last_run_at: '2026-05-08', icon: 'Send' },
  { id: '8', name: 'Reply Handler Agent', role: 'Classifies and responds to replies', description: 'Analyzes prospect replies, classifies intent, and drafts responses.', status: 'idle', last_action: 'Classified 3 replies', last_run_at: '2026-05-07', icon: 'MessageCircle' },
  { id: '9', name: 'Follow-Up Agent', role: 'Tracks follow-up timing', description: 'Monitors lead pipeline and reminds when follow-ups are due.', status: 'working', last_action: 'Flagged 5 leads needing follow-up', last_run_at: '2026-05-09', icon: 'Clock' },
  { id: '10', name: 'Proposal Agent', role: 'Creates proposals', description: 'Generates complete proposals with executive summary, scope, pricing, and terms.', status: 'idle', last_action: 'Created proposal for TechStart Inc.', last_run_at: '2026-05-06', icon: 'FileText' },
  { id: '11', name: 'Meeting Prep Agent', role: 'Prepares for sales meetings', description: 'Researches leads and creates meeting agendas, talking points, and closing strategies.', status: 'idle', last_action: 'Prepared brief for call with DataFlow Ltd.', last_run_at: '2026-05-03', icon: 'Calendar' },
  { id: '12', name: 'Weekly CEO Report Agent', role: 'Generates weekly reports', description: 'Summarizes weekly marketing activity, metrics, and recommended next actions.', status: 'idle', last_action: 'Generated Week 18 report', last_run_at: '2026-05-02', icon: 'BarChart3' },
]

export const mockMessages: AgentMessage[] = [
  { id: '1', agent_id: '3', agent_name: 'Landing Page Agent', product_id: '1', product_name: 'AI Website Audit Tool', message: 'Landing page copy is ready for review. Includes hero, problem section, how-it-works, pricing, and FAQ.', priority: 'high', status: 'pending', requires_human: true, recommended_action: 'Review and approve landing page copy', created_at: '2026-05-08T14:30:00Z' },
  { id: '2', agent_id: '7', agent_name: 'Outreach Agent', product_id: '1', product_name: 'AI Website Audit Tool', lead_id: '1', lead_name: 'Sarah Chen at GrowthMetrics', message: 'I created 3 outreach messages for Sarah Chen (CEO, GrowthMetrics). Ready for your approval before sending.', priority: 'high', status: 'pending', requires_human: true, recommended_action: 'Approve outreach sequence', created_at: '2026-05-08T15:00:00Z' },
  { id: '3', agent_id: '4', agent_name: 'Content Agent', product_id: '1', product_name: 'AI Website Audit Tool', message: 'Generated 10 LinkedIn posts for AI Website Audit Tool. 6 are problem/solution, 2 are case-study style, 2 are direct offer posts.', priority: 'medium', status: 'pending', requires_human: true, recommended_action: 'Review and approve LinkedIn posts', created_at: '2026-05-09T09:00:00Z' },
  { id: '4', agent_id: '8', agent_name: 'Reply Handler Agent', lead_id: '3', lead_name: 'Marcus Johnson at ScaleOps', message: 'Marcus replied asking for pricing details. He seems interested but wants to compare with competitors. I classified this as "Asked for price".', priority: 'urgent', status: 'pending', requires_human: true, recommended_action: 'Confirm which pricing package to share', created_at: '2026-05-08T16:45:00Z' },
  { id: '5', agent_id: '9', agent_name: 'Follow-Up Agent', lead_id: '5', lead_name: 'Elena Vasquez at BrightPath', message: 'Elena has not replied after 5 days. Should I send follow-up 2?', priority: 'medium', status: 'pending', requires_human: true, recommended_action: 'Approve sending follow-up 2', created_at: '2026-05-09T08:00:00Z' },
  { id: '6', agent_id: '10', agent_name: 'Proposal Agent', lead_id: '2', lead_name: 'David Park at TechStart Inc.', product_id: '1', product_name: 'AI Website Audit Tool', message: 'Proposal draft is ready for TechStart Inc. Includes scope, timeline, and pricing at $149/month. Please review before I generate the cover email.', priority: 'high', status: 'pending', requires_human: true, recommended_action: 'Review and approve proposal', created_at: '2026-05-08T11:00:00Z' },
  { id: '7', agent_id: '6', agent_name: 'Lead Research Agent', product_id: '1', product_name: 'AI Website Audit Tool', message: 'Found 30 new leads matching ICP. 8 look low quality (small companies, no budget signals). Please review the filtered list.', priority: 'medium', status: 'pending', requires_human: true, recommended_action: 'Review lead quality and approve list', created_at: '2026-05-07T10:00:00Z' },
  { id: '8', agent_id: '11', agent_name: 'Meeting Prep Agent', lead_id: '4', lead_name: 'James Wright at DataFlow Ltd.', message: 'Meeting with James Wright is tomorrow at 2pm. I prepared a brief with company background, pain points, and suggested agenda.', priority: 'high', status: 'done', requires_human: false, recommended_action: 'Review meeting brief', created_at: '2026-05-08T17:00:00Z' },
]

export const mockLeads: Lead[] = [
  { id: '1', company_name: 'GrowthMetrics', contact_name: 'Sarah Chen', job_title: 'CEO', email: 'sarah@growthmetrics.example', linkedin_url: 'linkedin.example/in/sarahchen', website: 'growthmetrics.example', industry: 'MarTech', country: 'USA', product_id: '1', status: 'message_drafted', priority_score: 85, last_contact_date: '', next_followup_date: '2026-05-10', notes: 'Synthetic demo lead. Company has 20-50 employees.', agent_recommendation: 'High priority. CEO is active on LinkedIn, likely decision maker.' },
  { id: '2', company_name: 'TechStart Inc.', contact_name: 'David Park', job_title: 'Marketing Director', email: 'david@techstart.example', linkedin_url: 'linkedin.example/in/davidpark', website: 'techstart.example', industry: 'SaaS', country: 'USA', product_id: '1', status: 'proposal_needed', priority_score: 92, last_contact_date: '2026-05-06', next_followup_date: '2026-05-09', notes: 'Synthetic demo call. Wants proposal for team of 5.', agent_recommendation: 'Send proposal ASAP. High intent buyer.' },
  { id: '3', company_name: 'ScaleOps', contact_name: 'Marcus Johnson', job_title: 'VP Operations', email: 'marcus@scaleops.example', linkedin_url: 'linkedin.example/in/marcusjohnson', website: 'scaleops.example', industry: 'Operations', country: 'UK', product_id: '1', status: 'replied', priority_score: 78, last_contact_date: '2026-05-08', next_followup_date: '2026-05-09', notes: 'Asked about pricing. Comparing with competitors.', agent_recommendation: 'Share pricing with differentiation points.' },
  { id: '4', company_name: 'DataFlow Ltd.', contact_name: 'James Wright', job_title: 'CTO', email: 'james@dataflow.example', linkedin_url: 'linkedin.example/in/jameswright', website: 'dataflow.example', industry: 'Data Analytics', country: 'Canada', product_id: '1', status: 'meeting_booked', priority_score: 88, last_contact_date: '2026-05-07', next_followup_date: '2026-05-09', notes: 'Demo meeting tomorrow at 2pm. Technical buyer.', agent_recommendation: 'Focus on API and integration capabilities.' },
  { id: '5', company_name: 'BrightPath', contact_name: 'Elena Vasquez', job_title: 'Head of Digital', email: 'elena@brightpath.example', linkedin_url: 'linkedin.example/in/elenavasquez', website: 'brightpath.example', industry: 'Digital Agency', country: 'Spain', product_id: '1', status: 'contacted', priority_score: 65, last_contact_date: '2026-05-04', next_followup_date: '2026-05-09', notes: 'No reply after first message. Agency with 10-20 clients.', agent_recommendation: 'Send follow-up 2 with case study.' },
  { id: '6', company_name: 'CloudNine Solutions', contact_name: 'Aisha Patel', job_title: 'Founder', email: 'aisha@cloudnine.example', linkedin_url: 'linkedin.example/in/aishapatel', website: 'cloudnine.example', industry: 'Cloud Services', country: 'India', product_id: '1', status: 'interested', priority_score: 82, last_contact_date: '2026-05-07', next_followup_date: '2026-05-10', notes: 'Interested but wants to see a demo first.', agent_recommendation: 'Schedule demo call this week.' },
  { id: '7', company_name: 'NexGen Marketing', contact_name: 'Tom Brennan', job_title: 'Marketing Manager', email: 'tom@nexgenmarketing.example', linkedin_url: 'linkedin.example/in/tombrennan', website: 'nexgenmarketing.example', industry: 'Marketing Agency', country: 'Australia', product_id: '1', status: 'new', priority_score: 70, last_contact_date: '', next_followup_date: '', notes: 'Synthetic demo lead. Medium-size agency.', agent_recommendation: 'Research further before outreach.' },
  { id: '8', company_name: 'Pixel Perfect', contact_name: 'Lisa Nakamura', job_title: 'Creative Director', email: 'lisa@pixelperfect.example', linkedin_url: 'linkedin.example/in/lisanakamura', website: 'pixelperfect.example', industry: 'Design Agency', country: 'Japan', product_id: '2', status: 'new', priority_score: 55, last_contact_date: '', next_followup_date: '', notes: 'Potential fit for Proposal Builder Pro.', agent_recommendation: 'Good ICP match for proposal tool.' },
]

export const mockContent: ContentAsset[] = [
  { id: '1', product_id: '1', product_name: 'AI Website Audit Tool', type: 'linkedin_post', title: 'Most small businesses have broken websites', body: 'I audited 50 small business websites last month.\n\n43 of them had critical SEO issues.\n38 had performance problems.\n29 had accessibility violations.\n\nThe worst part? None of them knew.\n\nThat is why we built an AI audit tool that checks everything in 5 minutes.\n\nNo more guessing. No more expensive consultants.\n\nDrop your URL below and I will send you a free mini-audit.', cta: 'Drop your URL for a free audit', status: 'needs_review', publish_date: '2026-05-12', created_at: '2026-05-09' },
  { id: '2', product_id: '1', product_name: 'AI Website Audit Tool', type: 'linkedin_post', title: 'Why your developer says your site is fine', body: 'Your developer says your website is fine.\n\nBut your bounce rate is 78%.\nYour page speed score is 34.\nYour meta descriptions are missing.\n\nDevelopers build. They don\'t audit.\n\nYou need a different lens.\n\nOur AI Website Audit Tool checks 200+ factors in 5 minutes.\n\nIt finds what humans miss.', cta: 'Try a free audit', status: 'draft', publish_date: '2026-05-14', created_at: '2026-05-09' },
  { id: '3', product_id: '1', product_name: 'AI Website Audit Tool', type: 'carousel', title: '5 Website Mistakes Costing You Customers', body: 'Carousel outline for LinkedIn', cta: 'Get your free audit', status: 'draft', publish_date: '2026-05-16', created_at: '2026-05-09' },
  { id: '4', product_id: '1', product_name: 'AI Website Audit Tool', type: 'one_pager', title: 'AI Website Audit Tool — One Pager', body: 'Product overview one-pager for lead generation and sales conversations.', cta: 'Start your audit today', status: 'draft', publish_date: '', created_at: '2026-05-09' },
  { id: '5', product_id: '2', product_name: 'Proposal Builder Pro', type: 'linkedin_post', title: 'I lost a $15K deal because of a bad proposal', body: 'True story: I lost a $15K deal last year.\n\nNot because of price.\nNot because of skill.\n\nBecause my proposal looked like a Word doc from 2010.\n\nThe client told me: "We went with someone who looked more professional."\n\nThat is when I started building Proposal Builder Pro.\n\nNow I generate polished proposals in 10 minutes.\n\nNever lose a deal to bad formatting again.', cta: 'Try Proposal Builder Pro', status: 'approved', publish_date: '2026-05-10', created_at: '2026-05-08' },
]

export const mockOutreach: OutreachMessage[] = [
  { id: '1', lead_id: '1', lead_name: 'Sarah Chen', product_id: '1', channel: 'email', sequence_number: 1, subject: 'Quick question about GrowthMetrics website', body: 'Hi Sarah,\n\nI noticed GrowthMetrics is growing fast — congrats on the recent product launch.\n\nI ran a quick check on your website and found a few areas where you might be leaving traffic on the table (SEO gaps, page speed issues).\n\nWould it be useful if I sent you a free 5-minute audit report? No strings attached.\n\nBest,\n[Your name]', status: 'draft', created_at: '2026-05-08' },
  { id: '2', lead_id: '1', lead_name: 'Sarah Chen', product_id: '1', channel: 'email', sequence_number: 2, subject: 'Re: Quick question about GrowthMetrics website', body: 'Hi Sarah,\n\nJust following up on my last email. I know things get busy.\n\nI ran a similar audit for a MarTech company last month and they found 12 critical issues they didn\'t know about. Fixed them and saw a 23% traffic increase in 6 weeks.\n\nHappy to do the same for GrowthMetrics if you are interested.\n\nBest,\n[Your name]', status: 'draft', created_at: '2026-05-08' },
  { id: '3', lead_id: '1', lead_name: 'Sarah Chen', product_id: '1', channel: 'linkedin', sequence_number: 1, subject: '', body: 'Hi Sarah — love what you are building at GrowthMetrics. I help MarTech companies find hidden website issues with AI audits. Would love to connect.', status: 'draft', created_at: '2026-05-08' },
  { id: '4', lead_id: '3', lead_name: 'Marcus Johnson', product_id: '1', channel: 'email', sequence_number: 1, subject: 'Website performance for ScaleOps', body: 'Hi Marcus,\n\nI came across ScaleOps and was impressed by your approach to operations automation.\n\nI noticed your website has some performance bottlenecks that might be affecting your conversion rates. Our AI audit tool checks 200+ factors in 5 minutes.\n\nWant me to send you a free report?\n\nBest,\n[Your name]', status: 'approved', created_at: '2026-05-06' },
]

export const mockProposals: Proposal[] = [
  { id: '1', lead_id: '2', lead_name: 'David Park — TechStart Inc.', product_id: '1', product_name: 'AI Website Audit Tool', title: 'AI Website Audit Tool — TechStart Inc. Proposal', executive_summary: 'TechStart Inc. needs a scalable way to monitor website health across their portfolio of 12 client sites. Our AI Website Audit Tool provides automated, ongoing monitoring with actionable recommendations.', pricing: '$149/month (Team plan, up to 10 sites)', status: 'needs_review', created_at: '2026-05-08' },
  { id: '2', lead_id: '6', lead_name: 'Aisha Patel — CloudNine Solutions', product_id: '1', product_name: 'AI Website Audit Tool', title: 'AI Website Audit Tool — CloudNine Solutions Proposal', executive_summary: 'CloudNine Solutions manages cloud infrastructure for SMBs. Adding website auditing to their service offering would increase client value and stickiness.', pricing: '$99/month (Pro plan, up to 5 sites)', status: 'draft', created_at: '2026-05-07' },
]

export const mockTasks: Task[] = [
  { id: '1', agent_name: 'Reply Handler Agent', lead_name: 'Marcus Johnson', title: 'Confirm pricing for ScaleOps', description: 'Marcus asked for pricing. Choose which package to share.', priority: 'urgent', status: 'pending', due_date: '2026-05-09' },
  { id: '2', agent_name: 'Proposal Agent', lead_name: 'David Park', title: 'Review TechStart proposal', description: 'Proposal draft is ready. Review scope, pricing, and terms.', priority: 'high', status: 'pending', due_date: '2026-05-09' },
  { id: '3', agent_name: 'Content Agent', product_name: 'AI Website Audit Tool', title: 'Approve LinkedIn posts batch', description: '10 LinkedIn posts ready for review.', priority: 'medium', status: 'pending', due_date: '2026-05-10' },
  { id: '4', agent_name: 'Follow-Up Agent', lead_name: 'Elena Vasquez', title: 'Decide on follow-up 2', description: 'Elena has not replied in 5 days. Approve or skip follow-up.', priority: 'medium', status: 'pending', due_date: '2026-05-09' },
  { id: '5', agent_name: 'Meeting Prep Agent', lead_name: 'James Wright', title: 'Review meeting brief', description: 'Meeting with DataFlow tomorrow. Brief is ready.', priority: 'high', status: 'done', due_date: '2026-05-08' },
  { id: '6', agent_name: 'Landing Page Agent', product_name: 'AI Website Audit Tool', title: 'Approve landing page copy', description: 'Full landing page copy drafted. Review before deployment.', priority: 'high', status: 'pending', due_date: '2026-05-10' },
]

export const mockReport: WeeklyReport = {
  id: '1',
  period: 'May 2–8, 2026',
  leads_added: 12,
  leads_contacted: 8,
  replies: 4,
  interested: 3,
  calls_booked: 2,
  proposals_sent: 1,
  clients_won: 0,
  best_message: 'Email 1 to ScaleOps (33% reply rate pattern)',
  best_offer: 'AI Website Audit Tool — free audit hook',
  blockers: [
    'Need more case studies for credibility',
    'Landing page not live yet',
    'Carousel designs pending',
  ],
  next_actions: [
    'Approve and publish landing page',
    'Send proposal to TechStart Inc.',
    'Follow up with 3 silent leads',
    'Post 3 LinkedIn posts this week',
    'Schedule demo with CloudNine Solutions',
  ],
  created_at: '2026-05-02',
}
