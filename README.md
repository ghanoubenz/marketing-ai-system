# Agentic Operations Platform

A multi-agent workflow platform for turning business inputs into strategy, content, outreach, proposal, and reporting outputs through structured AI agents and human approval.

## Why I Built This

I built this to explore how business operations can be organized around AI agents without giving those agents unchecked control. The useful part is not just generating text; it is capturing context, routing structured outputs, reviewing them, and tracking the state of work across a dashboard.

## The Problem

Business workflows often spread context across notes, CRM records, proposal drafts, content plans, and reporting tasks. AI can help draft and summarize, but the output becomes hard to trust if there is no state model, approval inbox, or audit trail. A practical agent platform needs structured outputs and human review before business actions happen.

## Workflow

1. Create project.
2. Add business context.
3. Run strategy agent.
4. Review structured output.
5. Approve or reject.
6. Generate content, outreach, proposal, or reporting assets.
7. Track status in dashboard.

## Workflow Infographics

- [Platform overview](docs/infographics/agentic-platform-overview.svg)
- [Agent workflow](docs/infographics/agent-workflow.svg)
- [Architecture](docs/infographics/agent-architecture.svg)

## Architecture

- Next.js / React / TypeScript frontend.
- Next.js API routes for agent execution and workflow actions.
- Supabase / PostgreSQL schema for projects, leads, messages, assets, proposals, reports, workflows, and activity logs.
- AI provider layer with Anthropic, OpenAI, Gemini, and GPT image provider adapters represented in code.
- Human approval inbox for reviewing agent messages before downstream use.
- Project context and knowledge modules for keeping agent outputs tied to workflow state.

## What I Built

I designed the agent workflow model, mapped the business operations process, structured the project state, and built the portfolio-safe implementation to demonstrate how the platform works.

My focus was:
- converting business operations into agent-assisted workflows
- defining approval gates between agents
- connecting AI output to dashboard state
- separating strategy, content, outreach, proposal, and reporting agents
- keeping private operational data out of the public repository

## Agent Design

Agents are organized around workflow roles rather than generic chat. The platform includes strategy, research, content, outreach, proposal, image prompt, carousel, CMO review, and weekly operations flows. Outputs are stored as structured messages so they can be approved, edited, rejected, or used by downstream steps.

## Data Model

The Supabase schema models projects, leads, content assets, outreach messages, proposals, reports, activity logs, agent messages, and workflow runs. This lets the UI show state instead of treating AI output as a disposable chat transcript.

## Human Approval Flow

AI output is routed through an inbox-style review layer. A user can approve, reject, edit, or mark output as done. Downstream generation should depend on approved context rather than raw unreviewed output.

## Architecture Decision Notes

- I used Supabase/Postgres because agent workflows need persisted state, not only prompt responses.
- I separated provider adapters from agent routes so different tasks can use different model providers.
- I kept approval state in the workflow because business outputs should not become external actions automatically.
- I removed mock business results from the public repo and replaced them with empty demo-safe placeholders.

## Security & Data Privacy

This repository is a portfolio-safe version of the system. All real client data, API keys, tender documents, CRM exports, generated proposals, calendar outputs, outreach lists, logs, and operational results have been removed.

Any files shown in `/examples`, `/test-fixtures`, or `/schemas` are dummy samples created only to demonstrate workflow structure.

The system is designed around:
- environment variables for secrets
- human approval gates before external actions
- empty placeholder folders for generated outputs
- no real production data in the public repository
- separation between demo data and private operational data

## Current Status

This is a portfolio-safe version of the system. The public repository demonstrates the app structure, provider layer, Supabase schema, API routes, agent workflow model, and approval approach. Private business data, production outputs, calendar results, and credentials have been removed.

Status:
- Workflow architecture: documented
- Demo schemas: included
- Sensitive outputs: removed
- Real credentials: not included
- Production data: not included

## How to Run Locally

1. Copy `.env.example` to `.env.local`.
2. Add your own Supabase and AI provider credentials.
3. Run `npm install`.
4. Run `npm run dev`.
5. Use dummy data only in the public version.

## Future Improvements

- Add role-based permissions for approval queues.
- Add demo seed data that is clearly fake.
- Add workflow run visualization and stricter schema validation.
