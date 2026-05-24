-- Migration 004: Add missing message_type values
-- Run this in Supabase SQL Editor

-- Drop and recreate the message_type check constraint to include lead_research
ALTER TABLE agent_messages DROP CONSTRAINT IF EXISTS agent_messages_message_type_check;
ALTER TABLE agent_messages ADD CONSTRAINT agent_messages_message_type_check
  CHECK (message_type IN ('strategy','content','outreach','reply','proposal','report','tool_request','warning','blocker','lead_research'));

-- Update CMO Review Agent to active
UPDATE agents SET status = 'active' WHERE name = 'CMO Review Agent';

-- Update Weekly CEO Report Agent to active
UPDATE agents SET status = 'active' WHERE name = 'Weekly CEO Report Agent';
