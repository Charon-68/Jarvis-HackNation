# AI Apprentice — Project Context

> **Status:** Hackathon MVP implementation context  
> **Challenge:** 7th Global AI Hackathon — ElevenLabs × Hack-Nation — **The AI Apprentice**  
> **Chosen workflow:** Support-ticket triage / support escalation  
> **Primary MVP path:** **Capture → Map → Teach**

---

## 1. Purpose of This File

This file is the shared context for all three developers and all coding agents working on the repository.

It is the project's **source of truth for product intent, workflow semantics, implementation boundaries, architecture assumptions, tool responsibilities, and integration expectations**.

Before making architectural or cross-module changes, read this file together with:

- `README.md`
- `ARCHITECTURE.md`
- `WORKFLOW.md`
- `INTEGRATION.md`

Do not silently redefine the product, workflow, shared contracts, or ownership boundaries.

### Shared-document rule

The central repository contains shared documentation and schemas. Individual coding agents must treat these as controlled contracts.

Do not rewrite a shared document simply to suit one implementation branch. When a cross-cutting change is required, update the relevant shared file deliberately and keep all other contributors informed.

---

## 2. Problem We Are Solving

The challenge is about preserving practical knowledge held by experienced workers before that knowledge is lost.

A traditional screen recording captures **what happened**: clicks, navigation, field changes, and visible actions. It does not reliably capture:

- why the expert made a decision;
- which exceptions they recognize;
- which thresholds or contextual signals matter;
- when they would stop normal processing;
- when they would escalate or ask another person.

The AI Apprentice should behave like an apprentice sitting beside an expert:

1. Observe the expert's digital work.
2. Understand meaningful screen changes.
3. Stay quiet while the expert is actively working.
4. Ask short, contextual questions at useful pauses.
5. Capture the expert's reasoning and guardrails.
6. Run a spoken debrief to close knowledge gaps.
7. Explain the learned process back to the expert for confirmation/correction.
8. Turn the verified knowledge into a clickable **Work Map**.
9. Use the Work Map to coach a new employee.
10. Test the new employee on a case the expert did not demonstrate.
11. Catch at least one wrong decision before it is saved.

The challenge is explicitly about an **apprentice, not a recorder**.

---

## 3. Source Challenge Requirements

The official challenge defines three mandatory modules.

### Module 1 — Capture

The expert shares their screen and performs a real task while an ElevenLabs voice agent operates alongside the workflow.

Required behavior:

- Ask at least **3 live questions** during the task.
- Each question should be about something **visible on screen**.
- Questions should happen at a **natural pause**, not while the expert is actively typing/reading/speaking.
- At least **1 live question must reveal or probe a guardrail**.
- Screen understanding should be represented as meaningful **events**, rather than treating the full video as the knowledge representation.

The implementation should use ElevenLabs' native agent capabilities for voice interaction, while our application supplies the workflow/screen context needed by the agent.

### Module 2 — Map

When the task finishes, the Apprentice performs a short spoken debrief.

Required behavior:

- Ask at least **3 follow-up questions** that were not answered during the task.
- Perform a **teach-back**: explain the complete process in the Apprentice's own words.
- The expert must be able to confirm or correct the teach-back.
- Produce a clickable Work Map.
- Every important step should link to a screen moment and the expert's reasoning.
- The Work Map must contain decisions, reasons, and guardrails.

### Module 3 — Teach

A new hire performs a fresh case on their own screen.

Required behavior:

- The new case must not be the exact case demonstrated by the expert.
- The tutor observes the new hire's work.
- The tutor explains the expert's process and asks the new hire to predict decisions where useful.
- The tutor catches at least **one wrong decision before it is saved**.
- The intervention must explain the correction using the reasoning learned from the expert.

### Trust

The demo should also show:

- an **off-the-record / pause recording** control for the expert;
- a credible approach to **PII protection/redaction**.

These requirements are the minimum acceptance bar for the MVP.

---

## 4. Our Product Interpretation

The challenge's invoice-processing story is only a **running example**.

We deliberately use a **support-ticket triage workflow** because it is easier to build, easier to control during a live demo, and naturally contains judgment calls, escalation rules, exceptions, and safety-related stop conditions.

We are **not** building an invoice application.

We are **not** building a general-purpose enterprise automation platform.

We are building one polished vertical workflow that demonstrates the same knowledge-transfer problem.

---

## 5. Product Principle

### The core distinction

> **Do not capture clicks. Capture decisions.**

The product should discover:

- what the expert did;
- why they did it;
- what signals changed the decision;
- when they would do something differently;
- when they would stop;
- who they would ask;
- what a new hire must understand to make the same decision correctly.

A transcript or screen recording by itself is not sufficient.

### Architecture principle

> **Use the strongest provided platform capability instead of rebuilding it.**

For this MVP:

- ElevenLabs owns the **conversational voice layer** as much as possible.
- Anthropic/Claude owns the **multimodal perception and reasoning tasks** as much as possible.
- Lovable accelerates the **product/workspace UI**.
- Presidio supports **privacy/redaction**.
- Bright Data, WebArena, and O*NET stay outside the critical MVP path.

---

## 6. Chosen Workflow — Support Ticket Triage

The demo application is a fake enterprise support system.

The workflow should feel realistic enough that the expert is visibly performing a real desk-work task.

The core workflow is:

```text
Ticket Queue
    ↓
Open Ticket
    ↓
Inspect Customer / Issue
    ↓
Assess Scope + Impact
    ↓
Choose Priority
    ↓
Choose Responsible Team
    ↓
Choose Action
    ↓
Save / Escalate
```

The exact styling can evolve, but the business states and decisions must remain deterministic enough for a reliable hackathon demo.

The AI should be able to observe meaningful state changes such as:

- ticket opened;
- priority changed;
- responsible team changed;
- action changed;
- decision saved or blocked.

---

## 7. Demo Ticket Set

The support workflow uses a small deterministic set of tickets based on the shared workflow spreadsheet/demo.

| Ticket | Situation | Intended decision / teaching signal |
|---|---|---|
| T001 | Full production outage affecting all customers | P1 / immediate escalation / infrastructure or incident response |
| T002 | Single-user login issue | Routine support handling; do not over-escalate an isolated issue |
| T003 | Possible customer data loss after an update | P1 / engineering escalation / **stop normal troubleshooting** |
| T004 | Simple password-reset request | P3 / normal support handling |
| T005 | API failures affecting multiple customers | P1 / engineering / systemic incident handling |
| T006 | Dashboard performance issue affecting several customers | P2 / engineering / investigate performance |

The exact wording and UI presentation may differ, but the semantic intent must remain stable.

---

## 8. Hidden Judgment and Guardrails

The workflow should **not** print the expert's hidden rules as explicit instructions on the main task UI.

The Apprentice is supposed to discover them through observation, live questioning, debrief, and teach-back.

Examples of knowledge the expert may reveal:

### Scope / impact

- One user affected → generally routine.
- Multiple customers affected → may indicate a systemic incident.
- Full production outage → highest urgency.

### Data-loss guardrail

Possible customer data loss is a major stop condition.

The expert should stop ordinary troubleshooting and escalate rather than casually proceeding with actions that could alter evidence or customer data.

### Severity / priority reasoning

The expert may use thresholds or combinations of signals rather than one field alone.

The UI should show enough information to support a judgment, while the hidden reasoning is learned through the interview/debrief.

### Exception / escalation reasoning

When normal handling is unsafe or insufficient, the correct behavior may be:

```text
STOP → ESCALATE → ASK THE APPROPRIATE TEAM
```

These are the intended knowledge semantics for our demo workflow. They should not be treated as generic industry policy outside this application.

---

## 9. Golden Demo Scenario

The most important integration test is intentionally deterministic:

```text
1. Expert opens T003.
2. Expert reviews the ticket.
3. Expert chooses P1 / Engineering / Stop + Escalate.
4. Screen understanding detects the important decision.
5. ElevenAgents asks why the expert stopped normal handling.
6. Expert explains the possible-data-loss guardrail.
7. Additional live/debrief questions uncover scope and escalation logic.
8. Apprentice performs teach-back.
9. Expert confirms/corrects the explanation.
10. Work Map stores the learned rule and evidence.
11. New hire receives an unseen case with a similar risk pattern.
12. New hire attempts an unsafe normal-support action / low-priority decision.
13. The evaluator detects the mismatch against the learned rule.
14. Save is blocked.
15. Tutor explains the guardrail using the expert's reasoning.
16. Relevant expert evidence is replayed where useful.
17. New hire corrects the decision.
18. Training result is recorded/analyzed.
```

If this scenario works reliably, the core product is working.

---

## 10. System Architecture — High Level

The MVP is a **single web application** with three functional modules. We do not require three independent AI agents.

```text
                             WEB APP
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
          CAPTURE              MAP               TEACH
             │                  │                  │
             │                  │                  │
       screen + voice       Work Map        new-hire tutor
             │                  │                  │
             ▼                  │                  ▼
       Browser Capture          │            Screen + Voice
             │                  │                  │
             ▼                  │                  ▼
        Claude Vision           │        Claude / Evaluator
             │                  │                  │
             ▼                  │                  ▼
       Screen Events ───────────┘          Tutor Intervention
             │
             ▼
      ElevenAgents Interviewer
             │
             ▼
       Expert Transcript
             │
             ▼
        ElevenLabs Debrief
             │
             ▼
      Events + Transcript + Answers
             │
             ▼
     Claude / Structured Synthesis
             │
             ▼
         Work Map JSON
             │
             ▼
       Work Map / Tutor Knowledge
```

### Important implementation change

ElevenLabs is now a **first-class conversational platform component**, not merely a voice API.

Use its native capabilities for:

- embedded voice interaction via Web SDK / Widget;
- interviewer and tutor agents;
- Dynamic Variables;
- Client Tools / Webhook Tools for application context and agent↔application integration;
- multi-stage debrief workflows;
- interactive voice simulation/testing;
- conversation analysis and data collection where useful.

Our application remains responsible for the Support Triage state, screen capture, deterministic save/block behavior, visual Work Map, evidence presentation, and product UX.

---

## 11. Technology Responsibilities

### Lovable / frontend stack

Use Lovable primarily to accelerate creation of the polished web application and workflow workspace.

Frontend owns:

- dashboard;
- ticket queue;
- active support-ticket view;
- expert capture workspace;
- ElevenLabs agent/widget placement;
- session controls;
- Work Map visualization;
- expert evidence replay;
- new-hire training workspace;
- tutor intervention UI;
- training results;
- screen-sharing controls;
- pause/off-record controls.

Lovable is a productivity resource, not part of the AI reasoning architecture.

### ElevenLabs / ElevenAgents

ElevenLabs is the primary **conversation, voice, coaching, and conversation-analysis layer**.

Use ElevenAgents for:

- expert interviewer;
- live questions;
- spoken debrief;
- teach-back;
- new-hire tutor.

Use native ElevenLabs capabilities where they reduce custom code:

- **Web SDK / Widget** for embedding low-latency conversational audio in the application;
- **Dynamic Variables** to expose current workflow/screen context to the agent;
- **Client Tools / Webhook Tools** for two-way interaction with frontend/server state;
- **multi-stage agent flows / workflows / procedures** for structured debrief and knowledge-review stages;
- **interactive voice simulation/testing** for trainee-facing voice practice where applicable;
- **Conversation Analysis / Data Collection** for structured post-session analysis, evaluation fields, or metrics.

Do not build a custom speech-to-text or text-to-speech stack unless required by an integration failure.

### Anthropic / Claude

Use Claude as the primary multimodal perception and reasoning resource unless the team explicitly decides otherwise.

Use it for:

1. **Screen understanding** — screenshot/frame → structured `ScreenEvent`.
2. **Work Map generation / synthesis** — events + transcript + expert answers → `WorkMap`.
3. **Guardrail and exception extraction**.
4. **New-hire decision evaluation support** and semantic explanation.

Use deterministic rules for known critical demo guardrails wherever possible. Claude should explain and reason over the context rather than being the sole authority for deterministic save/block decisions.

Do not fine-tune a model for this MVP.

### Presidio

Use Presidio for the privacy requirement where practical:

- detect/redact PII in transcripts;
- detect/redact PII in captured images where needed.

Also provide a visible **Pause / Don't Record** control in the UI.

The privacy implementation should be isolated so the golden demo remains usable if advanced redaction is unavailable.

### Bright Data

Bright Data is an optional enrichment resource.

It is **not on the critical path**.

Do not introduce a Bright Data dependency until the required MVP is working end-to-end.

Potential future/optional uses include:

- external information retrieval for richer case generation;
- realistic public/company data;
- optional workflow context.

### O*NET

O*NET is a supporting research resource for discovering or validating knowledge-driven desk tasks.

It is not part of the runtime MVP.

### WebArena

WebArena is an optional screen sandbox/reference resource.

For this 12-hour build, we prefer our small controlled fake support application because it gives us deterministic state and a reliable judge demo.

### ElevenLabs MCP

MCP is optional and **not required for the initial MVP**.

A possible later use is a tutor tool such as:

```text
get_guardrail(step_id)
```

The tutor should not depend on MCP for the golden demo.

---

## 12. What We Are Building vs. What Is Provided

| Component | Status | Notes |
|---|---|---|
| Product concept | Provided by challenge | We implement it for support triage |
| Capture / Map / Teach requirements | Provided | Mandatory |
| ElevenLabs credits | Provided | Core voice/conversation resource |
| ElevenAgents | Provided platform/resource | Configure interviewer, debrief, tutor |
| ElevenLabs Web SDK / Widget | Platform capability | Use for embedded voice experience |
| ElevenLabs Dynamic Variables / Tools | Platform capability | Use for application context and agent integration |
| ElevenLabs workflows / multi-stage flows | Platform capability | Use for structured debrief where appropriate |
| ElevenLabs conversation analysis/data collection | Platform capability | Use for structured post-session results where useful |
| Vision model | Not provided as a finished product | We connect Claude API / another vision model |
| Work Map | Not provided | We generate and render it |
| Frontend | We build | Lovable accelerates it |
| Screen sharing | We build | Browser screen capture API |
| Support-ticket application | We build | Controlled fake workflow |
| Decision evaluator | We build | Prefer deterministic rules + model explanation |
| Storage | We build | Lightweight persistence is enough |
| Presidio | Suggested/provided resource | Use for privacy where feasible |
| O*NET | Suggested source | Research only |
| WebArena | Suggested sandbox | Not required for MVP |
| Bright Data credits | Provided | Optional, not critical |
| Anthropic credits | Provided | Core to vision/reasoning |
| Lovable Pro | Provided | Core productivity accelerator |

---

## 13. Team Ownership

There are three developers. Work is divided by technical layer rather than by product module so integration is easier.

### Person 1 — Frontend / Product / Workflow UI

Owns:

- web application shell;
- Support Triage fake application;
- expert capture UI;
- browser screen-sharing controls;
- ElevenLabs Widget/SDK placement and frontend integration surface;
- AI side-panel shell;
- Work Map UI;
- expert evidence replay;
- new-hire training UI;
- intervention presentation/blocking UI;
- training results;
- demo workflow state.

Does **not** own:

- Claude API logic;
- ElevenLabs agent prompt/flow configuration;
- Work Map generation;
- backend intelligence.

### Person 2 — ElevenLabs / Voice / Conversation

Owns:

- ElevenAgents configuration;
- interviewer;
- live question behavior;
- Dynamic Variables;
- Client/Webhook Tools used by the agent;
- spoken debrief;
- teach-back;
- tutor agent;
- multi-stage conversational flows;
- interactive voice simulation/testing;
- conversation analysis/data collection configuration;
- voice-side integration hooks.

### Person 3 — Vision / Reasoning / Backend

Owns:

- screen frame processing;
- Claude Vision integration;
- `ScreenEvent` generation;
- event/transcript → Work Map;
- guardrail extraction;
- new-hire decision evaluation;
- deterministic decision rules;
- session persistence/API;
- privacy pipeline / Presidio.

### Shared

All three are responsible for:

- keeping `README.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `WORKFLOW.md`, and `INTEGRATION.md` coherent;
- using the canonical shared schemas;
- not breaking another person's interface contract without discussion;
- validating the golden demo path after cross-cutting changes.

---

## 14. Shared Integration Contracts

The exact schema definitions should live in the shared code/schema location, but these objects define the conceptual boundaries.

### ScreenEvent

```ts
interface ScreenEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  ticketId?: string;
  type:
    | "ticket_opened"
    | "field_changed"
    | "priority_changed"
    | "team_changed"
    | "action_changed"
    | "decision_saved";
  description: string;
  previousValue?: string;
  newValue?: string;
  screenshotRef?: string;
}
```

### ExpertAnswer

```ts
interface ExpertAnswer {
  id: string;
  sessionId: string;
  timestamp: number;
  question: string;
  answer: string;
  relatedEventId?: string;
}
```

### WorkMapStep

```ts
interface WorkMapStep {
  id: string;
  stepNumber: number;
  timestamp: number;
  ticketId?: string;
  observedAction: string;
  decision: string;
  expertReason: string;
  guardrails: string[];
  exceptions: string[];
  teachingPoint: string;
  screenshotRef?: string;
  expertQuote?: string;
}
```

### WorkMap

```ts
interface WorkMap {
  id: string;
  workflowName: string;
  expertName: string;
  durationSeconds: number;
  steps: WorkMapStep[];
}
```

### TutorIntervention

```ts
interface TutorIntervention {
  ticketId: string;
  attemptedDecision: {
    priority?: string;
    team?: string;
    action?: string;
  };
  correct: boolean;
  severity: "warning" | "critical";
  message: string;
  reason: string;
  guardrail?: string;
  expertEvidence?: {
    workMapStepId: string;
    timestamp: number;
    screenshotRef?: string;
  };
}
```

These contracts are integration-oriented. When formal schemas are created in shared code, those become authoritative over these illustrative definitions.

---

## 15. Frontend Behavior Expectations

### Expert Capture

The screen should behave like a normal enterprise support workspace:

```text
┌──────────────────────────────────────────────────────────┐
│ SUPPORT TRIAGE                                            │
├──────────────┬─────────────────────────────┬──────────────┤
│ Ticket Queue │ Active Ticket               │ AI Apprentice│
│              │                             │              │
│ T001         │ T003                        │ Listening... │
│ T002         │ Possible data-loss issue    │              │
│ T003   ◀     │ Priority: [ P1 ]            │ AI question  │
│ T004         │ Team:     [Engineering]     │ appears here │
│ T005         │ Action:   [Escalate]        │              │
│ T006         │                             │              │
│              │          [ Save ]            │              │
├──────────────┴─────────────────────────────┴──────────────┤
│ ● Recording     Pause     Stop                    00:47    │
└──────────────────────────────────────────────────────────┘
```

The actual styling can differ. The important point is that the AI voice experience feels integrated into the employee's normal work.

### AI panel

The application should expose:

- listening / thinking / speaking state;
- current question;
- recent observation/event when appropriate;
- microphone/voice state;
- session state.

It should not display raw prompts, API keys, internal tool payloads, or model implementation details during the normal demo.

### Work Map

A Work Map step should support:

- timestamp / screen moment;
- ticket;
- observed action;
- decision;
- reason;
- guardrail;
- exception;
- expert evidence / quote.

The Work Map must not be merely a transcript summary.

### New Hire

The new hire should use essentially the same work interface as the expert so the learned knowledge is clearly transferred into the real task context.

---

## 16. Screen Capture Principles

Use browser-native screen sharing.

Expected lifecycle:

```text
Share Screen
    ↓
Capture Active
    ↓
Frames available for analysis
    ↓
Pause Recording → no new processing
    ↓
Resume Recording → processing continues
    ↓
Stop / End Session → stream and session closed cleanly
```

Requirements:

- ask permission only after explicit user action;
- handle permission denial;
- handle user cancellation;
- handle unexpected stream termination;
- clearly show recording status;
- make pause visible;
- do not continuously retain unnecessary raw video as the primary knowledge representation.

The vision pipeline may sample selectively or use lightweight change detection before calling Claude. This is an implementation optimization, not a change to the product concept.

---

## 17. Voice-Agent Behavior

### Interviewer

The interviewer should behave like a thoughtful colleague.

Desired pattern:

```text
Expert actively typing
→ stay silent

Meaningful decision appears
→ wait for natural pause

Ask:
"Why did you mark this as P1?"
```

Prioritize questions that reveal:

- reasoning;
- thresholds;
- scope/impact interpretation;
- exceptions;
- guardrails;
- stop/escalate conditions.

Avoid questions whose answers are already obvious from the screen.

Use ElevenLabs' native agent turn-taking/context mechanisms rather than building a separate polling or speech stack unless an integration limitation requires it.

The official challenge suggests approximately three to five live questions per ten minutes, with the rest deferred to the debrief. The exact number must at least satisfy the official minimum of three live questions.

### Debrief

The debrief should focus on gaps that remain after live observation.

Ask at least three new questions.

Then perform teach-back:

```text
"Let me make sure I understood.
When X happens, you do Y because Z.
If A happens, you stop and escalate.
Is that correct?"
```

### Tutor

The tutor should:

1. explain only what is useful;
2. ask the new hire to predict decisions where valuable;
3. intervene when a learned guardrail is about to be broken;
4. connect the explanation to expert evidence;
5. allow correction and continuation.

ElevenAgents should provide the natural voice interaction; the application/evaluator should provide reliable state and decision enforcement.

---

## 18. Decision Evaluation Philosophy

Do not make a large language model the sole authority for known deterministic demo safety/guardrail decisions.

Use a hybrid approach:

```text
                  Work Map / known rules
                           │
                           ▼
                    Deterministic evaluator
                           │
                    allowed / disallowed
                           │
                           ▼
                    Claude / LLM support
                           │
                     natural explanation
                           │
                           ▼
                     Tutor intervention
```

Examples:

```text
possible data loss → STOP + ESCALATE
full outage → P1
multiple customers with systemic failure → high severity
```

The evaluator should determine whether the attempted state violates the known workflow rule. Claude/ElevenAgents should provide the natural-language reasoning and coaching.

The system must still work when a model is uncertain: critical save/block behavior must not depend on an unconstrained response.

---

## 19. Privacy and Trust

Trust is an explicit part of the challenge.

### Minimum implementation

#### Pause / Don't Record

Provide a visible control that immediately pauses capture/processing.

When active:

- frame processing stops;
- capture processing is paused;
- the UI clearly indicates that recording is paused.

#### PII redaction

Where personal data exists in demo content, redact or mask it before it is persisted or passed through downstream components where practical.

Example:

```text
Before:
John Smith
john@example.com

After:
[PERSON]
[EMAIL]
```

The privacy implementation can be lightweight for the MVP, but it should be real enough to demonstrate the concept rather than being only a slide claim.

---

## 20. Resource Strategy

The team has limited time, so resources are prioritized by usefulness to the required MVP.

### Tier 1 — Core

- ElevenLabs Creator access;
- ElevenAgents;
- ElevenLabs Web SDK / Widget;
- ElevenLabs Dynamic Variables / Client/Webhook Tools where useful;
- Anthropic credits / Claude;
- Lovable Pro;
- browser screen capture;
- simple backend/storage.

### Tier 2 — Required-supporting quality

- Presidio;
- deterministic decision rules;
- lightweight evidence/replay handling;
- structured conversation analysis/data collection where it materially improves the demo.

### Tier 3 — Optional only after core MVP is stable

- ElevenLabs MCP;
- richer external data.

### Explicitly deferred

- Bright Data integration;
- WebArena integration;
- O*NET runtime integration;
- multi-expert learning;
- multilingual training;
- agent-ready Work Map export;
- always-on apprentice;
- enterprise-scale knowledge memory;
- broad multi-workflow support;
- autonomous enterprise execution.

The sponsor-provided resources should accelerate the required product rather than expand the scope.

---

## 21. Non-Goals

This project is **not**:

- a generic chatbot;
- a video recording product;
- a click automation tool;
- a fully autonomous support agent;
- a replacement for expert judgment;
- a general-purpose company operating system;
- a fine-tuned foundation model;
- a large RAG platform;
- a browser extension;
- a multi-workflow enterprise product for the hackathon MVP.

The product must preserve the distinction between **learning expert judgment** and merely reproducing visible clicks.

---

## 22. Demo Reliability Rules

Because this is a live hackathon demo:

1. Deterministic demo cases are preferred over unpredictable external systems.
2. Critical evaluation rules should have deterministic fallbacks.
3. AI failures should degrade gracefully to a visible waiting/error state instead of crashing the workflow.
4. Every major state should be replayable/resettable.
5. Optional third-party services must not be required for the main demo.
6. The golden demo path must work from a fresh session.
7. The Work Map should remain viewable from a known fixture/fallback during development/demo preparation if live generation temporarily fails.
8. ElevenLabs being unavailable should not corrupt the support-ticket workflow state or Work Map state.
9. Backend/model failures must not accidentally allow an explicitly blocked demo decision to be saved.

---

## 23. Development Order

The preferred implementation order is:

```text
1. Shared workflow + schemas
       ↓
2. Support Triage frontend
       ↓
3. Screen-share lifecycle
       ↓
4. ElevenLabs interviewer + Widget/SDK
       ↓
5. Screen-event pipeline
       ↓
6. Screen events + conversation → Work Map
       ↓
7. Work Map UI
       ↓
8. ElevenLabs debrief / teach-back
       ↓
9. Tutor + voice simulation
       ↓
10. New-case evaluation
       ↓
11. Intervention + evidence replay
       ↓
12. Conversation analysis / results
       ↓
13. Privacy + polish
       ↓
14. Full demo rehearsal
```

Do not optimize optional components before the golden demo works.

---

## 24. Shared Repository Files

Expected shared documentation:

```text
README.md
CONTEXT.md          ← this file
ARCHITECTURE.md
WORKFLOW.md
INTEGRATION.md
```

Recommended shared data/types:

```text
shared/
├── types.ts
├── demo-tickets.json
├── demo-workmap.json
└── prompts/        (only if shared prompts are intentionally centralized)
```

The coding agents should treat shared files as controlled contracts.

Do not make broad architectural edits simply because they are convenient for one component.

---

## 25. Definition of Done

The MVP is considered complete when a judge can see the following without manual explanation from the team.

### Capture

- expert shares their screen;
- support ticket is visibly processed;
- AI remains quiet while active work is happening;
- AI asks at least three meaningful questions;
- at least one question uncovers/probes a guardrail.

### Map

- session ends;
- AI performs a debrief with at least three follow-ups;
- teach-back is completed and confirmed/corrected;
- Work Map appears;
- Work Map shows screen moments, decisions, reasons, and guardrails.

### Teach

- a fresh/unseen support case is opened;
- new hire makes a realistic wrong decision;
- system catches it before Save;
- tutor explains why the decision is wrong using learned expert reasoning;
- relevant expert evidence can be replayed;
- new hire corrects the decision;
- training result is recorded/analyzed.

### Trust

- expert can pause recording;
- personal information can be redacted/masked where applicable;
- the main demo does not depend on optional external resources.

---

## 26. Current Product Mantra

When there is disagreement about whether a feature belongs in the MVP, use this test:

> **Does this help the Apprentice capture expert judgment, verify it, map it, or teach it to a new hire?**

If not, it is probably out of scope for the 12-hour MVP.

The product story should remain simple:

```text
OBSERVE
   ↓
ASK WHY
   ↓
UNDERSTAND
   ↓
MAP
   ↓
TEACH
   ↓
TEST
```

The final goal is not to prove that the AI can automate support tickets.

The goal is to prove that the AI can **learn how an expert makes support decisions and transfer that knowledge to someone else**.

---

## 27. Authoritative External Resources

These resources were supplied in the challenge materials or by the hackathon:

### ElevenLabs

- Agents Quickstart: https://elevenlabs.io/docs/eleven-agents/quickstart
- LLM/model configuration: https://elevenlabs.io/docs/agentsplatform/customization/llm
- Tools: https://elevenlabs.io/docs/elevenagents/customization/tools
- Client Tools: https://elevenlabs.io/docs/elevenagents/customization/tools/client-tools
- MCP Tools: https://elevenlabs.io/docs/elevenagents/customization/tools/mcp

### O*NET

- https://www.onetcenter.org/database.html

### Presidio

- https://github.com/data-privacy-stack/presidio

### WebArena

- https://webarena.dev

These links are supporting implementation/reference resources. They do not override the challenge requirements or this repository's explicit scope.
