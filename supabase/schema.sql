-- AI Growth Desk — Real Database Schema v2
-- Run this in Supabase SQL Editor

create extension if not exists "uuid-ossp";

-- ============================================
-- 1. PROFILES (user settings/business profile)
-- ============================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  business_name text,
  role text default 'operator',
  default_tone text default 'professional',
  business_description text,
  proof_points jsonb default '[]'::jsonb,
  target_industries jsonb default '[]'::jsonb,
  preferred_pricing_style text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users manage own profile" on profiles for all using (id = auth.uid());

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- 2. PROJECTS
-- ============================================
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  product_type text,
  target_buyer text,
  industry text,
  country_or_region text,
  problem_solved text,
  value_proposition text,
  price_idea text,
  proof_or_background text,
  status text default 'idea' check (status in ('idea','testing','active','paused','validated','archived')),
  approved_offer text,
  approved_positioning jsonb,
  approved_icp jsonb,
  approved_pricing jsonb,
  approved_cta text,
  project_memory_summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_projects_user on projects(user_id);
create index if not exists idx_projects_status on projects(status);

alter table projects enable row level security;
create policy "Users manage own projects" on projects for all using (user_id = auth.uid());

-- ============================================
-- 3. AGENTS (definitions, not per-user)
-- ============================================
create table if not exists agents (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  role text not null,
  description text,
  system_prompt text,
  status text default 'disabled' check (status in ('active','paused','disabled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed the 16 agents
insert into agents (name, role, description, status) values
  ('Product Strategy Agent', 'Turns ideas into clear sellable offers', 'Analyzes product ideas and generates positioning, pricing, objections, and differentiation at B2B operator level.', 'active'),
  ('CMO Review Agent', 'Reviews agent outputs for quality', 'Scores outputs on clarity, buyer pain, commercial value, proof, and pipeline impact.', 'disabled'),
  ('ICP & Market Research Agent', 'Finds best customers', 'Creates ideal customer profiles, buyer personas, and market segments.', 'disabled'),
  ('Landing Page Agent', 'Creates landing page copy', 'Generates complete landing page copy with hero, CTA, FAQ, and structure.', 'disabled'),
  ('Content Agent', 'Creates sales-focused content', 'Writes LinkedIn posts, carousel outlines, scripts tied to active offers.', 'disabled'),
  ('Carousel / One-Pager Agent', 'Creates visual content outlines', 'Structures carousel slides and one-pager PDFs for LinkedIn and lead gen.', 'disabled'),
  ('Lead Research Agent', 'Builds and scores lead lists', 'Suggests lead sources, search queries, qualification rules.', 'disabled'),
  ('Outreach Agent', 'Drafts outreach messages', 'Creates personalized email sequences, LinkedIn messages, and call scripts.', 'disabled'),
  ('Reply Handler Agent', 'Classifies and responds to replies', 'Analyzes prospect replies, classifies intent, and drafts responses.', 'disabled'),
  ('Follow-Up Agent', 'Tracks follow-up timing', 'Monitors lead pipeline and reminds when follow-ups are due.', 'disabled'),
  ('Proposal Agent', 'Creates proposals', 'Generates complete proposals with executive summary, scope, pricing, and terms.', 'disabled'),
  ('Meeting Prep Agent', 'Prepares for sales meetings', 'Researches leads and creates meeting agendas and closing strategies.', 'disabled'),
  ('Weekly CEO Report Agent', 'Generates weekly reports', 'Summarizes weekly activity, metrics, and recommended next actions.', 'disabled'),
  ('Tool Scout Agent', 'Recommends tools and integrations', 'Finds tools that could help the project, requests approval before use.', 'disabled'),
  ('Learning Agent', 'Improves based on results', 'Tracks what works and updates project memory and playbooks.', 'disabled'),
  ('QA Agent', 'Quality checks outputs', 'Reviews content, outreach, and proposals for errors and consistency.', 'disabled')
on conflict (name) do nothing;

-- ============================================
-- 4. AGENT MESSAGES (Inbox)
-- ============================================
create table if not exists agent_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  campaign_id uuid,
  agent_id uuid references agents(id) on delete set null not null,
  lead_id uuid,
  title text not null,
  summary text,
  message_type text default 'strategy' check (message_type in ('strategy','content','outreach','reply','proposal','report','tool_request','warning','blocker')),
  priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  approval_level text default 'needs_approval' check (approval_level in ('auto_save','needs_approval','needs_human_action','blocked')),
  status text default 'needs_review' check (status in ('draft','needs_review','approved','rejected','edited','done','blocked')),
  input_payload jsonb,
  output_payload jsonb,
  recommended_action text,
  requires_human boolean default true,
  confidence numeric(3,2),
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  edited_at timestamptz
);

create index if not exists idx_am_user on agent_messages(user_id);
create index if not exists idx_am_status on agent_messages(status);
create index if not exists idx_am_project on agent_messages(project_id);
create index if not exists idx_am_agent on agent_messages(agent_id);

alter table agent_messages enable row level security;
create policy "Users manage own messages" on agent_messages for all using (user_id = auth.uid());

-- ============================================
-- 5. ACTIVITY LOGS
-- ============================================
create table if not exists activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid,
  agent_id uuid,
  lead_id uuid,
  event_type text not null,
  event_description text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_al_user on activity_logs(user_id);
create index if not exists idx_al_project on activity_logs(project_id);
create index if not exists idx_al_created on activity_logs(created_at desc);

alter table activity_logs enable row level security;
create policy "Users read own logs" on activity_logs for all using (user_id = auth.uid());

-- ============================================
-- 6. LEADS
-- ============================================
create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  company_name text not null,
  contact_name text,
  job_title text,
  email text,
  linkedin_url text,
  website text,
  industry text,
  country text,
  lead_source text,
  pain_hypothesis text,
  personalization_note text,
  priority_score integer default 0 check (priority_score between 0 and 100),
  status text default 'new' check (status in ('new','researched','message_drafted','contacted','replied','interested','meeting_booked','proposal_needed','proposal_sent','won','lost','not_relevant')),
  last_contact_date date,
  next_follow_up_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_leads_user on leads(user_id);
create index if not exists idx_leads_project on leads(project_id);
create index if not exists idx_leads_status on leads(status);

alter table leads enable row level security;
create policy "Users manage own leads" on leads for all using (user_id = auth.uid());

-- Add FK from agent_messages to leads
alter table agent_messages
  drop constraint if exists fk_am_lead;
alter table agent_messages
  add constraint fk_am_lead foreign key (lead_id) references leads(id) on delete set null;

-- ============================================
-- 7. CAMPAIGNS
-- ============================================
create table if not exists campaigns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  goal text,
  target_audience text,
  offer_angle text,
  status text default 'draft' check (status in ('draft','active','paused','completed','archived')),
  start_date date,
  end_date date,
  results_summary text,
  lessons_learned text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_campaigns_user on campaigns(user_id);
create index if not exists idx_campaigns_project on campaigns(project_id);

alter table campaigns enable row level security;
create policy "Users manage own campaigns" on campaigns for all using (user_id = auth.uid());

-- Add FK from agent_messages to campaigns
alter table agent_messages
  drop constraint if exists fk_am_campaign;
alter table agent_messages
  add constraint fk_am_campaign foreign key (campaign_id) references campaigns(id) on delete set null;

-- ============================================
-- 8. CONTENT ASSETS
-- ============================================
create table if not exists content_assets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  agent_id uuid references agents(id) on delete set null,
  content_type text not null check (content_type in ('linkedin_post','carousel','one_pager','video_script','email','landing_page_section')),
  title text not null,
  body text,
  visual_direction text,
  cta text,
  status text default 'draft' check (status in ('draft','needs_review','approved','rejected','posted')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ca_user on content_assets(user_id);
create index if not exists idx_ca_project on content_assets(project_id);

alter table content_assets enable row level security;
create policy "Users manage own content" on content_assets for all using (user_id = auth.uid());

-- ============================================
-- 9. OUTREACH MESSAGES
-- ============================================
create table if not exists outreach_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  campaign_id uuid references campaigns(id) on delete set null,
  lead_id uuid references leads(id) on delete cascade not null,
  channel text default 'email' check (channel in ('email','linkedin','whatsapp','call_script')),
  sequence_step integer default 1,
  subject text,
  body text not null,
  status text default 'draft' check (status in ('draft','needs_review','approved','manually_sent','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_om_user on outreach_messages(user_id);
create index if not exists idx_om_lead on outreach_messages(lead_id);

alter table outreach_messages enable row level security;
create policy "Users manage own outreach" on outreach_messages for all using (user_id = auth.uid());

-- ============================================
-- 10. PROPOSALS
-- ============================================
create table if not exists proposals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  title text not null,
  scope text,
  price text,
  timeline text,
  body text,
  status text default 'draft' check (status in ('draft','needs_review','approved','sent','won','lost')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_prop_user on proposals(user_id);

alter table proposals enable row level security;
create policy "Users manage own proposals" on proposals for all using (user_id = auth.uid());

-- ============================================
-- 11. TASKS
-- ============================================
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  agent_message_id uuid references agent_messages(id) on delete set null,
  lead_id uuid references leads(id) on delete set null,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  status text default 'open' check (status in ('open','in_progress','done','cancelled')),
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tasks_user on tasks(user_id);

alter table tasks enable row level security;
create policy "Users manage own tasks" on tasks for all using (user_id = auth.uid());

-- ============================================
-- 12. TOOL REQUESTS
-- ============================================
create table if not exists tool_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  requested_by_agent_id uuid references agents(id) on delete set null,
  tool_name text not null,
  purpose text,
  free_or_paid text,
  estimated_cost text,
  expected_benefit text,
  risk text,
  alternative_free_option text,
  urgency text,
  approval_status text default 'pending' check (approval_status in ('pending','approved','rejected','deferred')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tr_user on tool_requests(user_id);

alter table tool_requests enable row level security;
create policy "Users manage own tool requests" on tool_requests for all using (user_id = auth.uid());

-- ============================================
-- 13. REPORTS
-- ============================================
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  report_type text default 'weekly',
  report_period_start date,
  report_period_end date,
  summary text,
  metrics jsonb default '{}'::jsonb,
  recommendations jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_reports_user on reports(user_id);

alter table reports enable row level security;
create policy "Users manage own reports" on reports for all using (user_id = auth.uid());

-- ============================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  tbl text;
begin
  for tbl in select unnest(array['profiles','projects','leads','campaigns','content_assets','outreach_messages','proposals','tasks','tool_requests','agent_messages'])
  loop
    execute format('drop trigger if exists %I on %I', tbl || '_updated_at', tbl);
    execute format('create trigger %I before update on %I for each row execute function update_updated_at()', tbl || '_updated_at', tbl);
  end loop;
end;
$$;
