# AIvengers — ElevenLabs AI Apprentice MVP

This version intentionally does NOT use Lovable and does NOT put an ElevenLabs API key in browser code.

The project uses your teammate's existing PUBLIC ElevenLabs agent:

AGENT_ID = agent_9501m425131dfx5tmyks9aq9a003

## Architecture

MP4 screen recording
  -> screen_events.json (local event timeline)
  -> React event player
  -> sendContextualUpdate([SCREEN] ...)
  -> existing ElevenLabs voice agent
  -> expert answers by voice
  -> client tool calls when the agent needs ticket context

The MP4 itself is not uploaded to ElevenLabs. It is played locally as the visual reference. The agent receives concise contextual updates at meaningful timestamps.

## 1. Install Node.js

Install Node.js LTS if `node --version` or `npm --version` is not recognized. Then open a NEW PowerShell window.

## 2. Install dependencies

From this folder:

```powershell
npm install
```

## 3. Start the app

```powershell
npm run dev
```

Open the localhost URL Vite prints, usually:

http://localhost:5173

## 4. ElevenLabs dashboard configuration

Use the EXISTING public agent with ID:

agent_9501m425131dfx5tmyks9aq9a003

Do not create another agent.

### System prompt

Paste the following into the agent's system prompt:

You are an AI Apprentice interviewing an expert while they perform customer support ticket triage.

You receive [SCREEN] updates from the application. These updates describe what the expert is doing on screen. They are background context and do not require a response every time.

Your goal is to capture the expert's tacit knowledge.

DO NOT ask a question for every screen event.

Ask a concise question when the expert:
- makes a meaningful judgment
- changes priority
- changes the assigned team
- escalates a ticket
- encounters possible data loss
- distinguishes a single-user problem from a systemic problem
- applies an important guardrail
- makes a decision whose reasoning is not obvious

Prefer WHY questions over WHAT questions.

Good: "I noticed you marked this as P1. What made this a P1?"
Bad: "What priority did you select?"

Do not reveal a hidden expert rule before asking the expert. After the expert answers, identify the underlying rule, reasoning, exception and guardrail, briefly acknowledge it, and continue observing.

At the end summarize workflow steps, decisions, reasoning, exceptions, guardrails and teaching points.

## 5. Create these THREE client tools in the ElevenLabs dashboard

Tool names and parameter identifiers are case-sensitive. They must match the React code exactly.

### Tool A: get_ticket_context

Type: Client
Name: get_ticket_context
Description: Get the current support ticket details when more context is needed.

Required parameter:
- Identifier: ticket_id
- Type: String
- Description: The ticket ID, e.g. T001.

IMPORTANT: enable "Wait for response" if you want the agent to use the returned ticket JSON before continuing.

### Tool B: log_expert_decision

Type: Client
Name: log_expert_decision
Description: Record an expert decision and the rationale learned during the interview.

Required string parameters:
- ticket_id
- action_taken
- decision_rationale

Enable "Wait for response" if the agent should use the returned confirmation.

### Tool C: trigger_debrief_summary

Type: Client
Name: trigger_debrief_summary
Description: Start the end-of-session synthesis/debrief summary.

Required string/number parameters:
- session_id (String)
- tickets_processed (Number)

Enable "Wait for response" if needed.

## 6. Start the demo

1. Open http://localhost:5173
2. Click Start Apprentice.
3. Allow microphone access.
4. Confirm status becomes connected.
5. Start the MP4 from 00:00.
6. The app sends [SCREEN] updates as the video reaches each event timestamp.
7. Answer the agent naturally when it asks why/how/what rule you applied.

## 7. Strongest demo moments

T001: around 00:18 — production website down -> P1.

T003: around 00:50 — possible data loss -> STOP normal processing + escalate.

The T003 moment is especially useful because it demonstrates a guardrail, not just a click sequence.

## API key

Because the agent is PUBLIC, the browser starts it with the agentId only. The ElevenLabs API key is NOT required for this browser flow and MUST NOT be placed in React/Vite client code.

If you later make the agent private/authenticated, add a small server endpoint that uses the API key to obtain a signed URL or conversation token. Never expose the API key with VITE_ variables or in frontend source.
