# Feature Status — Marketing AI System
Last updated: 2026-05-10

## Working (Real Supabase + Real AI)

| Feature | API Route | UI Page | Notes |
|---------|-----------|---------|-------|
| Projects CRUD | `/api/projects` | `/products` | Create, archive, list |
| Product Strategy Agent | `/api/agents/product-strategy/run` | Run from `/products` | Claude API → agent_messages → approve → updates project |
| Landing Page Agent | `/api/agents/landing-page/run` | Run from `/products` | Requires approved strategy |
| Content Agent | `/api/agents/content/run` | Run from `/products` | LinkedIn posts, calendars |
| Image Prompt Agent | `/api/agents/image-prompt/run` | Run from `/products` | Premium image prompts |
| Outreach Agent | `/api/agents/outreach/run` | Run from `/products` or `/leads` | Supports lead-specific outreach |
| Lead Research Agent | `/api/agents/lead-research/run` | Run from `/products` | ICP + Apollo filters (no fake companies) |
| Proposal Agent | `/api/agents/proposal/run` | Run from `/products` or `/leads` | Supports lead-specific proposals |
| Carousel Agent | `/api/agents/carousel/run` | Run from `/products` | Premium carousel concepts |
| CMO Review Agent | `/api/agents/cmo-review/run` | "CMO Review" button in Inbox | Quality gate — scores any output |
| Weekly Ops Agent | `/api/agents/weekly-ops/run` | "Run Weekly Ops" on Dashboard | Pipeline math + Monday actions |
| Agent Inbox | `/api/agent-messages` | `/inbox` | Approve/reject/edit/done + CMO Review button |
| Approval Flow | `/api/agent-messages/[id]/approve` | — | Routes to correct tables on approve |
| Leads CRM | `/api/leads` | `/leads` | Add/edit/delete/status, run outreach/proposal |
| Content Library | `/api/content-assets` | `/content` | Copy, edit, status update, grouped by project |
| Outreach Sequences | `/api/outreach-messages` | `/outreach` | Copy, edit, status update, grouped by project |
| Proposals | `/api/proposals` | `/proposals` | Status tracking, pricing tiers display |
| Reports | `/api/reports` | `/reports` | Real aggregate counts from all tables |
| Activity Logs | via `logActivity()` | Shown in `/reports` | All agent actions logged |
| Dashboard | — | `/` | Real stats + pending inbox + Weekly Ops trigger |
| Model Router | `lib/ai/model-router.ts` | — | Anthropic primary, OpenAI fallback |

## Coming Soon (not yet built)

| Feature | Priority | Notes |
|---------|----------|-------|
| Real Auth (Supabase Auth) | High | Currently using hardcoded dev user |
| Settings Page | Medium | Profile, tone, proof points config |
| Reply Handler Agent | Medium | Classify and respond to prospect replies |
| Follow-Up Agent | Medium | Track overdue follow-ups, remind |
| Meeting Prep Agent | Low | Research lead before calls |
| Tool Scout Agent | Low | Recommend paid tools with approval flow |
| Learning Agent | Low | Track what works, update playbooks |
| QA Agent | Low | Cross-check outputs for consistency |
| CSV Lead Import | Medium | Bulk import from Apollo/Sales Nav exports |
| Proposal PDF Export | Low | Currently JSON/Markdown only |

## Database

All 13 tables exist with RLS enabled:
profiles, projects, agents, agent_messages, activity_logs, leads, campaigns, content_assets, outreach_messages, proposals, tasks, tool_requests, reports

**Required migration:** Run `supabase/migration-004-message-types.sql` to add `lead_research` to message_type constraint and activate CMO Review + Weekly Ops agents.

## Revenue Workflow (end-to-end)

```
Project → Strategy (approve) → Landing Page + Content + Images + Outreach
                              → Lead Research (ICP + Apollo filters)
                              → Add leads manually from Apollo/Sales Nav
                              → Run Outreach per lead → Copy → Send manually
                              → Track replies → Book meetings
                              → Run Proposal per lead → Send
                              → Mark won/lost → Revenue tracked
                              → Weekly Ops tells you what to do next
```

## Mock Data

`src/lib/mock-data.ts` exists but is NOT imported anywhere. No mock data is used in the app.
