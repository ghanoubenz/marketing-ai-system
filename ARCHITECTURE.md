# Marketing AI System — Product Architecture

## Overview
AI-powered marketing department dashboard for solo operators and small teams. 12 specialized agents handle repetitive marketing and sales work while the operator approves all outgoing actions.

## Tech Stack
- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS
- **Database:** Supabase (PostgreSQL + Auth + Realtime)
- **Deployment:** Vercel
- **AI:** Claude API (primary), OpenAI-compatible fallback
- **Automation:** n8n (Stage 7)
- **Export:** PDF/DOCX generation (Stage 6)

## MVP Feature List (v1)
1. Admin dashboard with sidebar navigation
2. Products/Offers CRUD
3. 12 Agent cards with manual run
4. Agent Inbox (central message hub)
5. Leads CRM (table + status pipeline)
6. Content drafts (LinkedIn posts, carousels, one-pagers)
7. Outreach drafts (email sequences, LinkedIn messages)
8. Proposal drafts
9. Manual approval buttons on all outputs
10. Basic weekly CEO report
11. Settings (business profile, tone, API keys)

## NOT in v1
- Auto-posting to LinkedIn
- Auto-sending emails
- Scraping/enrichment APIs
- Multi-user permissions
- Payment/billing
- Mobile app
- Chrome extension

## Database Schema (13 tables)

### users
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| email | text | |
| full_name | text | |
| business_name | text | |
| business_description | text | |
| writing_tone | text | professional, casual, etc. |
| target_industries | jsonb | |
| proof_points | jsonb | case studies, testimonials |
| created_at | timestamptz | |

### products
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | |
| name | text | |
| description | text | |
| target_audience | text | |
| problem_solved | text | |
| price_range | text | |
| competitors | text | |
| status | enum | idea, testing, active, paused, validated |
| offer_statement | text | AI-generated |
| buyer_pain_points | jsonb | AI-generated |
| pricing_packages | jsonb | AI-generated |
| objections | jsonb | AI-generated |
| differentiation | text | AI-generated |
| landing_page_copy | jsonb | AI-generated |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### agents
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | |
| name | text | |
| role | text | |
| description | text | |
| system_prompt | text | |
| status | enum | idle, working, waiting_approval, blocked |
| last_action | text | |
| last_run_at | timestamptz | |
| config | jsonb | custom instructions |
| created_at | timestamptz | |

### agent_messages
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| agent_id | uuid FK→agents | |
| user_id | uuid FK→users | |
| product_id | uuid FK→products | nullable |
| lead_id | uuid FK→leads | nullable |
| message | text | |
| output | jsonb | structured AI output |
| priority | enum | low, medium, high, urgent |
| status | enum | pending, approved, rejected, edited, done |
| requires_human | boolean | |
| recommended_action | text | |
| created_at | timestamptz | |
| resolved_at | timestamptz | |

### leads
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | |
| product_id | uuid FK→products | nullable |
| company_name | text | |
| contact_name | text | |
| job_title | text | |
| email | text | |
| linkedin_url | text | |
| website | text | |
| industry | text | |
| country | text | |
| status | enum | new, researched, message_drafted, contacted, replied, interested, meeting_booked, proposal_needed, proposal_sent, won, lost, not_relevant |
| priority_score | integer | 0-100 |
| last_contact_date | date | |
| next_followup_date | date | |
| notes | text | |
| agent_recommendation | text | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### outreach_messages
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| lead_id | uuid FK→leads | |
| product_id | uuid FK→products | |
| user_id | uuid FK→users | |
| channel | enum | email, linkedin, whatsapp, call |
| sequence_number | integer | 1, 2, 3... |
| subject | text | for emails |
| body | text | |
| status | enum | draft, approved, sent, replied |
| created_at | timestamptz | |
| sent_at | timestamptz | |

### content_assets
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | |
| product_id | uuid FK→products | |
| type | enum | linkedin_post, carousel, one_pager, video_script |
| title | text | |
| body | text | main content |
| slides | jsonb | for carousels |
| cta | text | |
| status | enum | draft, needs_review, approved, posted |
| publish_date | date | |
| created_at | timestamptz | |

### proposals
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | |
| lead_id | uuid FK→leads | |
| product_id | uuid FK→products | |
| title | text | |
| executive_summary | text | |
| problem_understanding | text | |
| proposed_solution | text | |
| scope_of_work | text | |
| timeline | text | |
| pricing | jsonb | |
| terms | text | |
| next_steps | text | |
| cover_email | text | |
| status | enum | draft, needs_review, approved, sent |
| created_at | timestamptz | |

### tasks
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | |
| agent_id | uuid FK→agents | nullable |
| product_id | uuid FK→products | nullable |
| lead_id | uuid FK→leads | nullable |
| title | text | |
| description | text | |
| priority | enum | low, medium, high, urgent |
| status | enum | pending, in_progress, done, cancelled |
| due_date | date | |
| created_at | timestamptz | |
| completed_at | timestamptz | |

### reports
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | |
| type | enum | weekly, monthly |
| period_start | date | |
| period_end | date | |
| data | jsonb | all metrics |
| summary | text | AI-generated |
| next_actions | jsonb | |
| created_at | timestamptz | |

### settings
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | |
| key | text | |
| value | jsonb | |
| updated_at | timestamptz | |

### activity_logs
| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| user_id | uuid FK→users | |
| agent_id | uuid FK→agents | nullable |
| action | text | |
| entity_type | text | product, lead, etc. |
| entity_id | uuid | |
| metadata | jsonb | |
| created_at | timestamptz | |

## Agent Architecture

Each agent follows a standard interface:
- Receives structured JSON input
- Returns structured JSON output
- Includes confidence score (0-1)
- Includes requires_human boolean
- Includes recommended_action
- Posts to agent_messages when needs approval

### Token Optimization Strategy
1. Store product/offer context once, pass only summary to agents
2. Use template + variables for repeated outputs
3. Cache agent outputs in database
4. Small prompts for small tasks, long prompts for major assets only
5. Summarize conversation history, don't pass full
6. Structured JSON outputs to minimize token waste
7. Only call AI on status change or manual trigger

## Dashboard Pages
1. `/` — Main Dashboard
2. `/agents` — Agent cards
3. `/inbox` — Agent Inbox
4. `/products` — Products/Offers
5. `/leads` — CRM
6. `/content` — Content Calendar
7. `/outreach` — Outreach Drafts
8. `/proposals` — Proposals
9. `/reports` — Weekly Reports
10. `/settings` — Settings

## Build Stages
1. Static dashboard UI with mock data ← CURRENT
2. Supabase database + CRUD
3. Agent Inbox + manual agent runs
4. Claude/OpenAI API integration
5. Lead CRM, outreach, content drafts
6. Proposal Agent + weekly report
7. n8n automations + external integrations
