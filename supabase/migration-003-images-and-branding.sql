-- Migration 003: Image storage URLs + brand profile per project
-- Run this in Supabase SQL Editor.
-- Also: create a PUBLIC bucket named "agent-images" in Supabase Storage.

-- 1. Add image URL columns to content_assets
alter table content_assets add column if not exists image_url text;
alter table content_assets add column if not exists image_urls jsonb;
alter table content_assets add column if not exists thumbnail_url text;
alter table content_assets add column if not exists generation_metadata jsonb;

-- 2. Add brand profile to projects
alter table projects add column if not exists brand_colors jsonb;
alter table projects add column if not exists brand_voice text;
alter table projects add column if not exists visual_style text;
alter table projects add column if not exists target_audience text;

-- 3. Add slide-level data to content_assets for carousels
alter table content_assets add column if not exists slides jsonb;

-- 4. Generated images table — for direct asset library
create table if not exists generated_images (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references projects(id) on delete set null,
  content_asset_id uuid references content_assets(id) on delete set null,
  agent_message_id uuid references agent_messages(id) on delete set null,
  url text not null,
  storage_path text not null,
  prompt text not null,
  revised_prompt text,
  use_case text,
  size text,
  created_at timestamptz default now()
);

create index if not exists idx_gi_user on generated_images(user_id);
create index if not exists idx_gi_project on generated_images(project_id);
create index if not exists idx_gi_message on generated_images(agent_message_id);

alter table generated_images enable row level security;
create policy "Users manage own images" on generated_images for all using (user_id = auth.uid());

-- 5. Storage bucket policy hint:
-- Create bucket "agent-images" with PUBLIC access in the Supabase dashboard.
-- File path convention: {user_id}/{project_id?}/{timestamp}-{filename}.png
