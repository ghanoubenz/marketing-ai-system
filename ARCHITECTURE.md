# Agentic Operations Platform Architecture

This document describes the portfolio-safe architecture of the platform. It avoids production claims and focuses on the code represented in this repository.

## Stack

- Frontend: Next.js, React, TypeScript
- Backend: Next.js API routes
- Data: Supabase / PostgreSQL schema and migrations
- AI providers: Anthropic, OpenAI, Gemini, and GPT image provider adapters
- Workflow state: projects, leads, agent messages, content assets, outreach messages, proposals, reports, workflows, and activity logs

## Main Design Choice

The platform treats AI output as workflow state. Agent responses are saved as structured records, reviewed by a human, then used by downstream workflow steps only after approval.

## Implemented Layers

1. UI pages for projects, agents, inbox, leads, content, outreach, proposals, reports, workflows, and settings.
2. API routes for agent execution and CRUD operations.
3. Supabase schema and migration files.
4. Provider adapters for multiple AI APIs.
5. Approval actions for agent messages.

## Integration Notes

External orchestration tools such as n8n can be used around this platform in a production workflow, but this repository focuses on the application layer and workflow state model.

## Privacy Boundary

No real CRM exports, proposal outputs, outreach lists, calendar data, or production credentials are included. Generated output folders are empty placeholders.
