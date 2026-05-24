import { NextRequest } from 'next/server'
import { runAI } from '@/lib/ai/model-router'
import { tryParseJSON } from '@/lib/ai/output-parser'
import { buildProjectContext, formatApprovedStrategy } from '@/lib/services/project-context'
import { createAgentMessage, lookupAgent } from '@/lib/services/agent-message'
import { logActivity } from '@/lib/services/activity-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SYSTEM_PROMPT = `You write cold outreach at the level of Jason Bay (Outbound Squad), Sam Nelson (SDR Whisperers), and Josh Braun. Replies, meetings, pipeline — not "tracked email opens".

You apply proven reply-rate formulas. Modern 2026 cold email is NOT "Hi {firstName}, I wanted to reach out about..." — that's instant delete.

═══════════════════════════════════════════════
THE PROVEN FORMULAS (use these exactly)
═══════════════════════════════════════════════

FORMULA 1 — JASON BAY 3-LINE
Line 1: Compliment-free observation about their business (specific, current, personalized)
Line 2: Connect it to a problem we solve, in question form
Line 3: One-sentence value prop + low-friction CTA
Total: under 75 words. Subject line = 2-4 words, lowercase, intriguing.

FORMULA 2 — JOSH BRAUN POKE-THE-BEAR
Open with a contrarian question that makes them stop and think.
"Most {role}s I talk to are still {old behavior}. Curious — is that the case at {Company} too?"
No pitch. No CTA. Just provoke a reply.

FORMULA 3 — SAM NELSON DOUBLE-TAP
Cold email 1: All value, no ask. Share a specific insight relevant to them.
Follow-up 24-48 hours later: One question. Reference the first email. Soft CTA.
Reply rates 2-3x single-touch.

FORMULA 4 — VIDEO FIRST-LINE (LinkedIn)
"Recorded a quick {2-min} video for {Company} — sharing 3 things I'd test if I were running {their function}. Want me to send it?"

═══════════════════════════════════════════════
THE NON-NEGOTIABLE RULES
═══════════════════════════════════════════════

EMAIL:
- Subject line: 2-4 words, lowercase, no exclamation, no question marks, intriguing not pitchy
- Body: under 75 words for cold, under 50 for follow-ups
- ZERO links in cold email 1 (link = spam filter)
- One question max per email. The question IS the CTA.
- Sign off: first name only. No "Best regards" / "Cheers" / company name signature.

LINKEDIN:
- Connection request note: under 250 chars, no pitch
- First message after connection: under 50 words
- Never lead with "Thanks for connecting!" — go straight to value

NEVER USE:
✗ "I hope this email finds you well"
✗ "I wanted to reach out / touch base / follow up"
✗ "Quick question / quick favor / circle back"
✗ "Let me know if you'd be open to a 15-min chat"
✗ "I'd love to learn more about your business"
✗ "Just bumping this to the top of your inbox"
✗ Any flattery: "I love what you're doing", "huge fan of your work"
✗ Generic templates: "We help companies like yours..."
✗ "Are you the right person to talk to about X?"

═══════════════════════════════════════════════
PERSONALIZATION TIERS
═══════════════════════════════════════════════

For each message, indicate the personalization layer required:
TIER 1 — Industry-level (works for anyone in target ICP)
TIER 2 — Role-specific (mentions the buyer's exact responsibilities)
TIER 3 — Company-specific (references something verifiable about their company — funding, hiring, recent post, product launch)
TIER 4 — Person-specific (references something they personally said, posted, or did)

Cold email 1 should be TIER 3 minimum. LinkedIn opener should be TIER 4 ideally.

═══════════════════════════════════════════════
PROOF & HONESTY — CRITICAL
═══════════════════════════════════════════════

NEVER fabricate case studies, statistics, or client results in outreach copy.
- Do NOT write "We helped [company] achieve X%" unless the operator provided that exact proof
- Use the operator's REAL proof points if provided. If none exist, lead with the PROBLEM and METHOD instead
- Placeholder: use {case_study} or {result_metric} where real proof should go, with a note to the operator
- A cold email that says "curious if you're seeing this problem" beats one with fake stats that destroy credibility on first reply

Respond with ONLY valid JSON matching the exact schema provided. No markdown, no code fences.`

const OUTPUT_SCHEMA = `{
  "agent_name": "Outreach Agent",
  "status": "needs_review",
  "summary": "<1-2 sentence summary of the outreach approach>",
  "outreach_sequence": [
    {
      "channel": "<email|linkedin|whatsapp|call_script>",
      "sequence_step": 1,
      "label": "<descriptive label e.g. Cold Email 1 (Bay 3-Line)>",
      "formula": "<Bay 3-Line|Braun Poke|Nelson Double-Tap|Video First-Line|Custom>",
      "personalization_tier": "<Tier 1|Tier 2|Tier 3|Tier 4>",
      "subject": "<email subject line — 2-4 words lowercase, null for non-email>",
      "body": "<full message text — strict word limits per channel>",
      "personalization_note": "<which specific data point about this lead must be referenced>",
      "timing": "<when to send relative to previous step>",
      "expected_reply_rate": "<honest estimate based on the formula and personalization tier>"
    }
  ],
  "objection_responses": [
    {
      "objection": "<common objection>",
      "response": "<suggested reply>"
    }
  ],
  "outreach_tips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "recommended_next_action": "<what to do with these messages>",
  "requires_human": true,
  "confidence": 0.0
}`

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) return Response.json({ error: 'Missing x-user-id header' }, { status: 401 })

  const body = await request.json()
  const projectId = body.project_id
  if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 })

  const ctx = await buildProjectContext(projectId, userId, { agentName: 'Outreach Agent' })
  if (!ctx) return Response.json({ error: 'Project not found' }, { status: 404 })

  if (!ctx.project.approved_offer) {
    return Response.json({ error: 'Run and approve Product Strategy Agent first.' }, { status: 400 })
  }

  const agent = await lookupAgent('Outreach Agent')
  if (!agent) return Response.json({ error: 'Outreach Agent not found in database.' }, { status: 500 })

  await logActivity({
    user_id: userId, project_id: projectId, agent_id: agent.id,
    event_type: 'agent.run_started',
    event_description: `Outreach Agent started for "${ctx.project.name}"`,
  })

  const leadContext = body.lead ? `
LEAD CONTEXT:
- Company: ${body.lead.company_name || 'Not specified'}
- Contact: ${body.lead.contact_name || 'Not specified'}
- Title: ${body.lead.job_title || 'Not specified'}
- Industry: ${body.lead.industry || 'Not specified'}
- Pain hypothesis: ${body.lead.pain_hypothesis || 'Not specified'}
- Notes: ${body.lead.notes || 'None'}

Personalize all messages for this specific lead.` : `No specific lead provided. Create template messages that can be personalized for any lead matching the ICP.`

  const userPrompt = `Create a premium B2B outreach sequence using the proven formulas.

${formatApprovedStrategy(ctx.project)}
${ctx.knowledge || ''}

${leadContext}

Generate exactly 7 messages, each using a SPECIFIC formula:

1. Cold Email 1 — Use Jason Bay 3-Line. Subject 2-4 words lowercase. Body under 75 words. Personalization Tier 3+.
2. Cold Email 2 (follow-up, 2 days later) — Use Sam Nelson Double-Tap. Reference the first email. Add ONE new insight. Soft CTA.
3. Cold Email 3 (break-up email, 7 days later) — One question. "Should I close the loop?" pattern. No pitch.
4. LinkedIn Connection Request — Under 250 chars. No pitch. Reference something specific from their profile or company.
5. LinkedIn Message 1 (after connect) — Use Video First-Line OR Josh Braun Poke. Under 50 words.
6. LinkedIn Message 2 (follow-up, 3 days later) — One specific question tied to the buyer's role.
7. Call opener script — 30-second voicemail OR live opener. Permission-based.

For EACH message, label which formula it uses and what personalization tier is required.

Then provide:
- 4 common objection responses (real objections this offer faces, not generic ones)
- 3 outreach tips specific to this ICP and channel

Every message must:
- Reference the approved offer's specific differentiation
- Use buyer's exact pain language
- Avoid every banned phrase (no "I hope this email finds you well", no "circle back", no flattery)

Respond with ONLY the JSON matching this schema:
${OUTPUT_SCHEMA}`

  try {
    const result = await runAI({
      taskType: 'outreach',
      preferredProvider: 'anthropic',
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 4096,
    })

    const parsed = tryParseJSON(result.text)
    if (!parsed) {
      await logActivity({
        user_id: userId, project_id: projectId, agent_id: agent.id,
        event_type: 'agent.output_failed',
        event_description: 'Outreach Agent returned invalid JSON',
      })
      return Response.json({ error: 'AI returned invalid JSON.' }, { status: 422 })
    }

    const saved = await createAgentMessage({
      userId, projectId, agentId: agent.id, agentName: 'Outreach Agent',
      title: `Outreach: ${ctx.project.name}${body.lead?.company_name ? ` → ${body.lead.company_name}` : ''}`,
      summary: (parsed.summary as string) || 'Outreach sequence generated',
      messageType: 'outreach',
      outputPayload: parsed,
      inputPayload: body.lead ? { lead: body.lead } : { project_id: projectId },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
    })

    return Response.json(saved, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logActivity({
      user_id: userId, project_id: projectId, agent_id: agent.id,
      event_type: 'agent.output_failed',
      event_description: `Outreach Agent failed: ${msg}`,
    })
    return Response.json({ error: `AI API call failed: ${msg}` }, { status: 500 })
  }
}
