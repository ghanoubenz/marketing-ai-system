-- Migration 002: Support new agent types
-- Run this in Supabase SQL Editor

-- Add image_prompt and video_prompt to content_assets content_type check
alter table content_assets drop constraint if exists content_assets_content_type_check;
alter table content_assets add constraint content_assets_content_type_check
  check (content_type in ('linkedin_post','carousel','one_pager','video_script','email','landing_page_section','image_prompt','video_prompt','content_calendar'));

-- Add metadata column to content_assets
alter table content_assets add column if not exists metadata jsonb default '{}'::jsonb;

-- Add metadata column to outreach_messages
alter table outreach_messages add column if not exists metadata jsonb default '{}'::jsonb;

-- Add metadata column to proposals
alter table proposals add column if not exists metadata jsonb default '{}'::jsonb;

-- Add agent_id to outreach_messages if missing
alter table outreach_messages add column if not exists agent_id uuid references agents(id) on delete set null;

-- Allow outreach templates without a specific lead
alter table outreach_messages alter column lead_id drop not null;
