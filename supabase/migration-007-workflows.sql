-- Workflows — saved agent chains / campaigns
-- Run this in Supabase SQL Editor

create table if not exists workflows (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  name text not null,
  description text,
  steps jsonb not null default '[]'::jsonb,
  status text default 'draft' check (status in ('draft', 'running', 'paused', 'completed', 'failed')),
  current_step integer default 0,
  results jsonb default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_wf_user on workflows(user_id);
create index if not exists idx_wf_project on workflows(project_id);
create index if not exists idx_wf_status on workflows(status);

alter table workflows enable row level security;
create policy "Users manage own workflows" on workflows for all using (user_id = auth.uid());
