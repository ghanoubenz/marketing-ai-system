-- Enable all agents and add missing ones
-- Run this in Supabase SQL Editor

-- Enable all existing agents
UPDATE agents SET status = 'active' WHERE status != 'active';

-- Add Research Agent if not exists
INSERT INTO agents (name, role, description, status) VALUES
  ('Research Agent', 'Searches Google & YouTube to learn new strategies', 'Searches the web for marketing frameworks, case studies, and expert knowledge. Saves learnings so all agents get smarter over time.', 'active')
ON CONFLICT (name) DO UPDATE SET status = 'active', description = EXCLUDED.description;

-- Remove the old duplicate ICP agent if Lead Research Agent already exists
DELETE FROM agents WHERE name = 'ICP & Market Research Agent' AND EXISTS (SELECT 1 FROM agents WHERE name = 'Lead Research Agent');
