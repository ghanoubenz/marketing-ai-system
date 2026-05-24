-- Knowledge Store — agents learn and save knowledge here
-- Run this in Supabase SQL Editor

create table if not exists agent_knowledge (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  source_type text not null check (source_type in ('youtube', 'google', 'article', 'agent_learning', 'user_input')),
  source_url text,
  source_title text,
  topic text not null,
  category text not null check (category in ('strategy', 'content', 'outreach', 'pricing', 'positioning', 'copywriting', 'lead_gen', 'sales', 'design', 'general')),
  key_takeaways text[] not null default '{}',
  full_summary text,
  applicable_agents text[] default '{}',
  confidence numeric(3,2) default 0.7,
  times_used integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_ak_user on agent_knowledge(user_id);
create index if not exists idx_ak_category on agent_knowledge(category);
create index if not exists idx_ak_topic on agent_knowledge(topic);
create index if not exists idx_ak_project on agent_knowledge(project_id);

alter table agent_knowledge enable row level security;
create policy "Users manage own knowledge" on agent_knowledge for all using (user_id = auth.uid());
