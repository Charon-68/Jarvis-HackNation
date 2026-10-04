# AI Apprentice - Support Triage

> **Hackathon MVP:** Capture how an experienced support engineer makes triage decisions, turn that judgment into a verified Work Map, and use the learned knowledge to coach a new support engineer on an unseen ticket.

This repository implements the **AI Apprentice** challenge from the ElevenLabs × Hack-Nation 7th Global AI Hackathon.

The challenge is not asking for a screen recorder or a generic chatbot. The system must observe an expert performing real desk work, ask targeted questions that reveal the expert's reasoning and guardrails, convert the session into a reusable workflow, and then teach that workflow to a new hire. The required product is organized into three modules: **Capture → Map → Teach**.

Our implementation uses the challenge's support-ticket workflow rather than the invoice example in the brief. The support workflow is deliberately small, deterministic, and demo-friendly while still containing hidden judgment, exceptions, and stop conditions.

---

## 1. Product Goal

### The problem

Experienced support engineers make decisions that are often not fully documented:

- how much impact a ticket has
- when a ticket becomes a system-wide incident
- when to escalate immediately
- when normal troubleshooting is appropriate
- when troubleshooting must stop to protect customer data or evidence

A normal process document or screen recording captures the **what**, but not the **why**.

### The solution

AI Apprentice learns from an expert while they work:

```text
Observe expert
      ↓
Detect meaningful screen events
      ↓
Make the current screen/workflow state available to ElevenAgents
      ↓
Ask "why?" at useful pauses
      ↓
Capture expert reasoning + guardrails
      ↓
Run conversational debrief
      ↓
Teach-back + expert confirmation
      ↓
Generate verified Work Map
      ↓
Train new hire on an unseen ticket
      ↓
Evaluate the trainee's decision
      ↓
Block unsafe save + coach the trainee
```

The product should feel like a **thoughtful digital apprentice**, not an automation script.

---

## 2. Challenge Requirements We Must Satisfy

The challenge has three required modules.

### Module 1 - Capture

The expert shares their screen while performing a real task. The Apprentice observes the screen and uses a voice agent to ask short questions at natural pauses.

Required behavior:

- At least **3 live questions** during the task.
- Each question must be about something **visible on the screen**.
- Questions should happen at a **natural pause**, not while the expert is actively typing/working.
- At least **1 live question must reveal a guardrail**.
- The system should capture events rather than treating the entire video as the knowledge representation.

### Module 2 - Map

When the task finishes, the Apprentice performs a short spoken debrief.

Required behavior:

- Ask at least **3 follow-up questions** that were not answered during the task.
- Run a **teach-back**: the Apprentice explains the process in its own words.
- The expert must be able to confirm or correct it.
- Produce a **clickable Work Map**.
- Every important step and guardrail must link to a screen moment and the expert's own words.

### Module 3 - Teach

The Work Map becomes the knowledge source for a tutor.

Required behavior:

- The new hire receives a **new case that the expert did not demonstrate**.
- The tutor watches the new hire's work.
- The tutor catches at least **one wrong decision before it is saved**.
- The tutor explains the correction using the expert's learned reasoning.

### Trust

The demo should also show:

- an **off-the-record / pause recording** control for the expert
- a credible approach to **PII protection/redaction**

---

## 3. Our Demo Workflow - Support Triage

Instead of the brief's invoice example, we use a support-ticket triage workflow.

The reference demo is intentionally simple: a support-ticket website with a ticket list, an active ticket/decision area, and an **AI Apprentice side panel**. The same triage workspace is reused for expert learning and new-hire training.

### Target workspace

```text
┌─────────────────────────────────────────────────────────────┐
│                     SUPPORT TRIAGE                          │
├────────────────┬─────────────────────────┬──────────────────┤
│ OPEN TICKETS   │      ACTIVE TICKET      │ AI APPRENTICE    │
│                │                         │                  │
│ T001           │ customer / issue       │ 🎙 voice agent   │
│ T002           │ scope                   │                  │
│ T003           │ priority                │ Listening...     │
│ T004           │ team                    │                  │
│ T005           │ action                  │ Question...      │
│ T006           │ [ SAVE ]                │                  │
└────────────────┴─────────────────────────┴──────────────────┘
```

The workflow is based on the provided support-triage spreadsheet and demo video.

### Canonical demo tickets

| Ticket | Scenario | Scope | Expected Priority | Team | Expected Action |
|---|---|---|---|---|---|
| T001 | Production website completely down | All customers | P1 | Infrastructure | Immediate escalation |
| T002 | One employee cannot log in | Single user | P3 | Support | Normal troubleshooting |
| T003 | Customer data disappeared after today's update | Potential data loss | P1 | Engineering | STOP normal processing + escalate |
| T004 | Password reset request | Single user | P3 | Support | Send reset procedure |
| T005 | API returning errors for many customers | Multiple customers | P1 | Engineering | Immediate escalation |
| T006 | Dashboard is slow for several customers | Multiple customers | P2 | Engineering | Investigate performance |

### Hidden knowledge we want the Apprentice to learn

These rules are deliberately not presented as an explicit SOP inside the ticket UI. The expert should reveal them through actions and spoken explanations.

1. **Determine scope before priority.**
   - One user vs many users vs everyone changes the decision.

2. **Full production outage is P1.**
   - If the whole service is down, treat it as a high-impact incident and escalate immediately.

3. **Single-user issues are normally routine.**
   - Do not escalate an isolated login problem without evidence of wider impact.

4. **Possible data loss is a safety guardrail.**
   - Stop normal troubleshooting.
   - Do not ask the customer to modify/retry data in a way that could destroy evidence or worsen the situation.
   - Escalate to Engineering.

5. **Multi-customer failure indicates systemic impact.**
   - Many customers seeing API errors suggests a system-wide incident.

6. **Repeated reports change severity.**
   - Several customers reporting slowness should trigger broader performance investigation.

The provided Work Map sheet and teaching script encode the same reasoning and guardrails.

---

## 4. Golden Demo Scenario

The most important demo path is intentionally deterministic.

### Expert phase

The expert processes the support tickets and makes the expected decisions.

The Apprentice observes meaningful screen events such as:

```text
00:08  Open T001
00:18  Set T001 priority → P1
00:33  Open T002
00:50  Open T003
01:07  Open T005
01:24  Open T006
```

At meaningful decision points, ElevenLabs asks questions such as:

> "Why did you mark T001 as P1?"

> "You stopped normal troubleshooting on T003. Why?"

The expert explains the reasoning in their own words.

### Debrief

After the task, the ElevenLabs debrief flow asks follow-ups such as:

- "Would you treat a login problem the same way if only one employee is affected?"
- "What changes if many customers report the same API error?"
- "What is the rule for possible data loss?"
- "When do you stop normal troubleshooting?"

The Apprentice then performs teach-back:

> "I check scope first, then assess impact, then escalate systemic or dangerous cases."

The expert confirms or corrects the explanation.

### Work Map

The resulting Work Map represents:

```text
Step
Screen Moment
Observed Action
Decision
Why (Expert's Words)
Guardrail
Teaching Point
Evidence
```

### New-hire phase

The trainee receives a case that the expert did not demonstrate:

> **12 customers lost transaction history after an update.**

The trainee attempts a routine P3 support decision.

The Apprentice detects the unsafe decision before save and responds with the learned rule:

> "Possible data loss is a stop-and-escalate case. What should you do next?"

The trainee corrects the decision to the learned safe action.

This demonstrates that the system has learned a rule rather than merely replaying the expert's clicks.

---

## 5. Architecture

The MVP is a **single web application** with three functional modules. We do not require three independent AI agents.

```text
                           WEB APP
                              │
              ┌───────────────┼────────────────┐
              │               │                │
              ▼               ▼                ▼
           CAPTURE           MAP             TEACH
              │               │                │
              │               │                │
       screen + voice     Work Map       new-hire tutor
              │               │                │
              ▼               │                ▼
        Claude Vision         │          screen + voice
              │               │                │
              ▼               │                ▼
       Screen Events ─────────┘         Decision Check
              │                              │
              ▼                              ▼
      ElevenAgents interviewer       Tutor Intervention
              │
              ▼
       Expert transcript
              │
              ├───────────────┐
              ▼               │
     ElevenAgents Debrief     │
              │               │
              ▼               │
      Expert confirmation     │
              │               │
              └──────┬────────┘
                     ▼
              Claude / backend
                     │
                     ▼
                Work Map JSON
                     │
              ┌──────┴───────┐
              ▼              ▼
         Work Map UI     ElevenAgents Tutor
                                │
                                ▼
                           New Hire
                                │
                                ▼
                           Claude Vision
                                │
                                ▼
                      Decision Evaluation
                                │
                         Wrong decision?
                           /         \
                         NO           YES
                         │             │
                      continue        ▼
                               Block Save + Tutor
```

### Core architecture principle

> **Our code handles product-specific screen/workflow state and deterministic business rules. ElevenLabs handles the conversational layer. Anthropic handles multimodal perception and knowledge/decision reasoning.**

This deliberately uses ElevenAgents' native capabilities rather than rebuilding them ourselves.

---

## 6. ElevenLabs-Native Implementation

ElevenLabs is not only the text-to-speech component. The project should use ElevenAgents for the conversational portions of the Apprentice wherever possible.

Current ElevenAgents capabilities relevant to this repository include:

- embeddable Widget / SDK for web applications
- configurable LLMs
- dynamic variables for runtime context
- Client Tools for client-side/UI operations
- Webhook Tools for server-side APIs
- Workflows for multi-stage/branching conversation flows
- Procedures for task-specific instructions
- conversation analysis
- success/evaluation criteria
- structured data collection
- agent testing and analytics

### Intended usage

```text
                        ElevenAgents
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
     Interviewer           Debrief              Tutor
          │                   │                   │
          │                   │                   │
      expert asks       missing knowledge     trainee coach
      why questions     + teach-back          + intervention
```

### Widget / SDK

The Apprentice voice UI should be integrated into the Support Triage web application through the ElevenAgents Widget or SDK rather than implementing a separate custom voice stack.

### Dynamic variables

Runtime application state can be exposed to the agent, for example:

```text
current_ticket_id
current_ticket_scope
current_priority
current_team
current_action
last_screen_event
capture_status
session_phase
```

Dynamic variables should be used for runtime context rather than hardcoding the current ticket or session state into the agent prompt.

### Client Tools

Use Client Tools when the ElevenAgents assistant needs to trigger a browser/UI operation, for example:

```text
show intervention
open Work Map step
highlight ticket field
pause/notify UI
request evidence replay
```

### Webhook Tools

Use Webhook Tools for authenticated server-side operations where the agent needs to query or invoke backend functionality.

### Workflows / Procedures

Use ElevenAgents Workflows or Procedures to structure multi-stage conversational behavior.

For this MVP, the intended conversation stages are:

```text
Expert Session
    ↓
Interview / Observe
    ↓
Debrief
    ↓
Teach-back
    ↓
Training Session
    ↓
Tutor
```

A simple proof-of-concept should prefer the lightest mechanism that reliably produces the desired behavior. Use structured procedures/workflow nodes only where deterministic sequencing is helpful, such as the debrief stages and mandatory teach-back.

### Conversation Analysis / Data Collection

Use ElevenLabs conversation analysis and data collection where useful for post-session outputs such as:

- whether required questions were asked
- whether the guardrail was surfaced
- whether teach-back occurred
- structured expert explanations
- structured training results

This reduces the amount of custom transcript parsing we need to build.

---

## 7. Anthropic / Claude Responsibilities

Claude is the **multimodal perception + knowledge synthesis + decision reasoning** layer.

### 1. Screen understanding

```text
Screen snapshot
      ↓
Claude Vision
      ↓
Structured ScreenEvent
```

Example:

```json
{
  "type": "action_changed",
  "ticketId": "T003",
  "previousValue": "Normal troubleshooting",
  "newValue": "STOP + escalate",
  "description": "Expert changed action to stop normal processing and escalate",
  "timestamp": 50
}
```

### 2. Work Map generation

```text
ScreenEvents
     +
Expert transcript
     +
Expert answers
     ↓
Claude
     ↓
WorkMap JSON
```

### 3. Guardrail extraction

Claude identifies:

- thresholds
- exceptions
- stop conditions
- escalation triggers
- the expert's reasoning

### 4. New-hire decision evaluation

Claude can provide semantic interpretation when the trainee's action requires reasoning.

Known critical rules should still have deterministic checks in the application so safety-critical demo behavior is reliable.

---

## 8. Why We Use a Fake Support Application

The challenge wants a real screen-based workflow, but the MVP only needs one task, one expert, and one new hire.

A deterministic fake support application is therefore preferable to integrating a production ticketing platform.

Benefits:

- completely controlled demo states
- repeatable screenshots/events
- deterministic correct/incorrect decisions
- easy creation of hidden judgment calls
- no external service dependency
- easy to demonstrate a wrong new-hire decision before save

The UI intentionally looks like a normal enterprise support workspace rather than a toy form.

---

## 9. Data Contracts

All three contributors must integrate through shared contracts rather than calling each other's internal implementation.

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

These interfaces are the primary integration boundary between the frontend, ElevenAgents and the intelligence/backend pipeline.

---

## 10. Three-Person Ownership

### Person 1 - Frontend / Product Layer

Owns:

- support-ticket application
- Expert Capture UI
- screen-sharing controls
- ElevenAgents widget/SDK integration surface
- AI side-panel shell
- Work Map UI
- evidence replay
- new-hire workspace
- intervention UI
- training result UI
- session controls

Does **not** own:

- Claude API calls
- ElevenLabs agent configuration/prompts
- Work Map generation
- backend evaluation logic

### Person 2 - ElevenLabs / Conversation Layer

Owns:

- ElevenAgents interviewer
- live question behavior
- dynamic variables
- Client/Webhook Tools used by the agent
- debrief
- teach-back
- tutor
- voice-agent configuration
- ElevenAgents Workflows/Procedures where useful
- conversation analysis / data collection configuration

### Person 3 - Vision / Backend / Intelligence Layer

Owns:

- Claude Vision
- screenshot → ScreenEvent
- event/transcript → Work Map
- guardrail extraction
- new-hire decision evaluation
- deterministic guardrail checks
- lightweight storage/API
- Presidio integration
- canonical shared data schemas

### Shared responsibilities

All three contributors must keep these synchronized:

- `CONTEXT.md`
- `ARCHITECTURE.md`
- `WORKFLOW.md`
- `INTEGRATION.md`
- `shared/types.ts`
- `shared/demo-tickets.json`

Do not allow individual branches to silently redefine the workflow or event schema.

---

## 11. Frontend Routes / Screens

The MVP should expose the following product flow:

```text
/
└── Dashboard

/expert
└── Learn From Expert
    └── Expert Capture

/debrief
└── Debrief / Teach-back

/work-map
└── Clickable Work Map

/training
└── New Hire Training

/results
└── Training Results
```

The core navigation should make the three modules explicit:

> **Capture → Map → Teach**

---

## 12. Screen Capture Behavior

Use browser-native screen capture rather than a browser extension.

Required controls:

- **Start Session**
- **Share Screen**
- **Stop Sharing**
- **Pause Recording**
- **Resume Recording**
- **End Session**

Expected behavior:

```text
Share Screen
    ↓
Capture active
    ↓
Frame/event processing
    ↓
Pause → stop event/frame processing
    ↓
Resume → continue
    ↓
End → stop all capture streams
```

The user must explicitly opt into screen sharing.

The system must handle the browser's screen-share stream ending unexpectedly.

The frontend owns capture lifecycle. It does **not** own Claude's visual reasoning.

---

## 13. Screen Event Strategy

We should not treat the full video as the knowledge representation.

Target pipeline:

```text
Screen frame
      ↓
Change / relevance check
      ↓
Claude Vision
      ↓
structured ScreenEvent
      ↓
shared application state
      ├──────────────→ ElevenAgents context
      └──────────────→ Work Map pipeline
```

Examples:

```json
{
  "type": "ticket_opened",
  "ticketId": "T003",
  "description": "Expert opened the data-loss ticket"
}
```

```json
{
  "type": "action_changed",
  "ticketId": "T003",
  "previousValue": "Normal troubleshooting",
  "newValue": "STOP + escalate",
  "description": "Expert changed action to stop normal processing and escalate"
}
```

The vision layer should focus on meaningful changes, not every pixel-level update.

---

## 14. Work Map Design

The Work Map is the core knowledge artifact.

A Work Map step should answer:

> **What happened?**

> **What decision was made?**

> **Why did the expert make it?**

> **What would make the expert stop/change the decision?**

> **Where is the evidence?**

Example:

```text
STEP 4

Screen moment: 00:50
Ticket: T003

Observed action:
Opened possible data-loss ticket

Decision:
P1 + STOP

Why:
Missing customer data can become worse if we ask them to change or retry things.

Guardrail:
Possible data loss → STOP normal processing and escalate.

Teaching point:
Protect evidence/data before troubleshooting.

Evidence:
00:50 screen moment + expert explanation
```

The Work Map UI must allow the judge to click a step and inspect its supporting evidence.

### Source of truth

The Work Map is generated from:

```text
Screen Events
     +
Expert conversation
     +
Debrief/teach-back
     ↓
Verified Work Map
```

Do not treat the raw transcript as the Work Map.

---

## 15. Tutor Behavior

The tutor should not simply tell the new hire the correct answer immediately.

Preferred interaction:

```text
New hire attempts decision
        ↓
Decision evaluator checks known rules
        ↓
Issue detected
        ↓
Tutor asks a short reasoning question
        ↓
New hire explains
        ↓
Tutor reinforces expert rule
        ↓
Wrong save remains blocked
        ↓
New hire corrects decision
        ↓
Save allowed
```

For the golden demo:

```text
New case:
12 customers lost transaction history after an update

New hire:
P3 / Support / Normal troubleshooting

Tutor:
"Before you save that, what should you consider when customer data may be missing?"

New hire:
Recognizes possible data loss

Tutor:
"Possible data loss is a stop-and-escalate case."

New hire:
P1 / Engineering / STOP + escalate

Save allowed.
```

ElevenAgents supplies the natural-language/voice interaction. The frontend/backend supplies the reliable save/block mechanism.

---

## 16. Decision Checking

Use deterministic rules wherever possible for critical safety/guardrail checks.

Use Claude for semantic understanding and explanation, but do not rely on an unconstrained LLM alone to determine whether a known demo rule is satisfied.

Example:

```text
if potentialDataLoss === true:
    requiredAction = "STOP + escalate"
    requiredTeam = "Engineering"
    requiredPriority = "P1"
```

Then Claude/ElevenAgents can provide the natural-language explanation.

This gives the demo both:

- reliable behavior
- meaningful AI reasoning

---

## 17. Privacy / Trust MVP

The challenge asks how the expert can take something off the record and how personal data on screen is protected.

### Off the record

Provide a visible control:

> **Pause / Don't Record**

When active:

- frame processing stops
- screen-event processing stops
- the voice agent should not be fed new screen-derived context from the paused period
- the UI clearly indicates that recording is paused

### PII

Where applicable, use Presidio to detect/redact:

- names
- email addresses
- phone numbers
- other obvious identifiers

The privacy layer should be isolated so the demo still works if redaction is unavailable.

---

## 18. MVP vs Deferred Features

### P0 - Required for submission

- Support Triage workflow
- Expert screen-sharing UI
- Screen-event pipeline
- ElevenLabs interviewer
- at least 3 live questions
- at least 1 guardrail question
- debrief with at least 3 follow-ups
- teach-back and expert confirmation
- Work Map generation
- Work Map UI
- new unseen case
- ElevenAgents tutor
- catch one wrong decision before save
- explanation using expert reasoning
- pause/off-record control
- basic PII protection
- reliable end-to-end demo

### P1 - Implement if the core path is stable

- polished replay UX
- richer training results
- stronger redaction coverage
- improved loading/error states
- basic persistence across refreshes
- richer ElevenLabs conversation analysis

### Deferred / out of scope for this MVP

The following are intentionally **not part of the initial implementation** due to the 12-hour constraint:

- Bright Data integration
- WebArena integration
- O*NET product integration
- multi-expert workflows
- multilingual stretch goal
- agent-ready guardrail export
- always-on apprentice
- enterprise-scale knowledge memory
- large-scale autonomous agent execution

---

## 19. Resource Allocation

| Resource | Primary role | MVP status |
|---|---|---|
| **Lovable Pro** | Rapid frontend/web-app development | Core |
| **ElevenLabs Creator / ElevenAgents** | Voice interviewer, debrief, teach-back, tutor, tools, workflows, conversation analysis | Core |
| **Anthropic credits** | Screen vision, knowledge synthesis, guardrail extraction, semantic evaluation | Core |
| **Browser Screen Capture API** | Expert/new-hire screen sharing | Core |
| **Microsoft Presidio** | PII protection/redaction | Lightweight trust feature |
| **O*NET** | Workflow/task reference | Reference only |
| **WebArena** | Fake-web-app/sandbox reference | Not required |
| **Bright Data** | External data acquisition | Not required |

### API/secret boundaries

Never expose long-lived Anthropic API keys or privileged server-side ElevenLabs credentials directly in client-side source code.

The browser should receive only the runtime information and public/client-safe configuration it actually needs.

---

## 20. Development Principles

### 1. Build one great workflow

Do not generalize prematurely.

### 2. Capture decisions, not clicks

The important output is expert judgment.

### 3. Use ElevenLabs instead of rebuilding voice infrastructure

Do not implement a separate speech-to-text → LLM → text-to-speech pipeline when ElevenAgents already supplies the required conversational infrastructure.

### 4. Ask less, later

The agent should remain quiet while the expert is actively working and ask at useful pauses.

### 5. Work Map is the shared source of learned knowledge

Capture writes evidence into the session; Map consolidates it; Teach consumes it.

### 6. Keep AI and UI loosely coupled

Use stable JSON/TypeScript contracts.

### 7. Prefer deterministic demo behavior

The judge should be able to reproduce the same golden path every time.

### 8. Protect the critical path

Optional resources must never be able to break the main demonstration.

### 9. Let the application enforce hard safety rules

Voice agents explain and coach; application logic blocks unsafe saves.

---

## 21. Local Development

### Prerequisites

Use the versions/tooling already established by the repository. The exact commands should follow the repository's current framework and package manager.

Expected environment variables will be similar to:

```bash
ANTHROPIC_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
```

Optional privacy/backend variables may be added later.

**Never commit secrets.**

### Development sequence

```text
1. Start frontend
2. Start backend/API if present
3. Verify Support Triage workflow without AI
4. Verify screen sharing
5. Verify ElevenAgents independently
6. Verify Claude Vision independently
7. Verify Work Map generation independently
8. Connect ScreenEvents → ElevenAgents
9. Connect WorkMap → Tutor
10. Verify save/block evaluator
11. Run full golden demo
```

---

## 22. Integration Checklist

Before calling the MVP complete, verify:

### Capture

- [ ] Expert can start a session.
- [ ] Expert can share their screen.
- [ ] Screen events are produced for meaningful changes.
- [ ] ElevenAgents is visible/available in the side panel.
- [ ] At least 3 questions are asked during the expert task.
- [ ] At least 1 question targets a guardrail.
- [ ] Questions do not interrupt active typing unnecessarily.
- [ ] Relevant runtime state reaches the ElevenLabs agent.

### Map

- [ ] Session ends cleanly.
- [ ] ElevenLabs debrief starts.
- [ ] At least 3 new follow-up questions are asked.
- [ ] Teach-back occurs.
- [ ] Expert can confirm/correct the learned process.
- [ ] Work Map is generated.
- [ ] Steps show action, decision, reason, guardrail and evidence.
- [ ] Steps link to screen moments.

### Teach

- [ ] New hire receives an unseen ticket.
- [ ] Tutor watches the new hire.
- [ ] A known wrong decision is detected.
- [ ] Wrong save is blocked.
- [ ] Tutor explains why using expert knowledge.
- [ ] New hire can correct the decision.
- [ ] Training result is recorded/shown.

### Trust

- [ ] Pause/off-record exists.
- [ ] Screen/event processing pauses while off-record.
- [ ] PII protection is demonstrated or clearly wired in.

### Demo quality

- [ ] No critical external dependency is required for the golden path.
- [ ] Loading and error states are handled.
- [ ] Demo can be reset and repeated.
- [ ] All three contributors can run the full flow from the central repository.

---

## 23. Hackathon Demo Narrative

The pitch should tell one simple story:

> **An experienced support engineer knows how to triage difficult tickets, but much of that judgment exists only in their head. AI Apprentice watches them work, asks why at the right moments, captures their guardrails, builds a Work Map, and then teaches a new engineer to make the same decisions on a new ticket.**

The demo should emphasize:

```text
CAPTURE
"Why did you do that?"

        ↓

MAP
"This is what I learned from you."

        ↓

TEACH
"Now let me see if the new hire can do it."
```

The strongest moment is not the screen recording. It is the point where the new hire is about to make the wrong decision and the Apprentice catches it using a rule it learned from the expert.

---

## 24. Reference Material

### Challenge brief

The authoritative challenge requirements are in the provided ElevenLabs × Hack-Nation problem statement.

### Provided support-triage materials

- `AI_Apprentice_Support_Triage_Workflow.xlsx`
  - Support Tickets
  - Work Map
  - Teaching Script
- `AI_Apprentice_Support_Triage_Demo.mp4`
  - Reference interaction/demo flow

### ElevenLabs

- Quickstart: https://elevenlabs.io/docs/eleven-agents/quickstart
- Agent overview: https://elevenlabs.io/docs/eleven-agents/overview
- LLM/model configuration: https://elevenlabs.io/docs/agents-platform/customization/llm
- Widget: https://elevenlabs.io/docs/eleven-agents/customization/widget
- Dynamic variables: https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables
- Tools: https://elevenlabs.io/docs/eleven-agents/customization/tools
- Client Tools: https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools
- Webhook Tools: https://elevenlabs.io/docs/eleven-agents/customization/tools/webhook-tools
- Workflows: https://elevenlabs.io/docs/eleven-agents/customization/agent-workflows
- Procedures: https://elevenlabs.io/docs/eleven-agents/customization/procedures
- Conversation Analysis: https://elevenlabs.io/docs/eleven-agents/customization/agent-analysis
- Data Collection: https://elevenlabs.io/docs/eleven-agents/customization/agent-analysis/data-collection

### O*NET

- https://www.onetcenter.org/database.html

### Presidio

- https://github.com/data-privacy-stack/presidio

---

## 25. Definition of Done

This project is considered MVP-complete when a judge can watch the following uninterrupted flow:

```text
Expert opens Support Triage
        ↓
Expert processes tickets
        ↓
Screen events are captured
        ↓
ElevenAgents asks contextual questions
        ↓
Expert explains hidden reasoning
        ↓
ElevenAgents runs debrief + teach-back
        ↓
Work Map appears
        ↓
New hire gets a different ticket
        ↓
New hire makes a wrong decision
        ↓
Evaluator blocks the save
        ↓
ElevenAgents Tutor explains the expert's rule
        ↓
New hire corrects it
        ↓
Save succeeds
```

**The success criterion is not that the AI can describe the workflow. The success criterion is that the new hire can use what the Apprentice learned to make a correct decision on a case the expert never demonstrated.**

---

## Current Implementation Philosophy

This repository is optimized for a short hackathon build.

We intentionally rely on **ElevenLabs-native capabilities** for voice interaction, agent turn-taking, agent tools, conversational workflows/procedures, and post-conversation analysis instead of recreating those systems ourselves. ElevenLabs' current documentation supports embedding agents into websites through its Widget/SDK, injecting runtime values with dynamic variables, triggering client-side functions with Client Tools, connecting server-side APIs with Webhook Tools, structuring conversations with Workflows/Procedures, and analyzing conversations with evaluation/data-collection features. 

The application-specific parts remain our responsibility:

```text
OUR CODE
├── Support Triage UI
├── Browser screen capture
├── ScreenEvent normalization
├── Deterministic support-triage rules
├── Work Map rendering
├── Evidence/replay UI
├── Save/block enforcement
├── Lightweight storage
└── Privacy controls

ELEVENLABS
├── Voice interaction
├── Interviewer
├── Turn-taking
├── Debrief
├── Teach-back
├── Tutor
├── Agent tools
├── Conversation workflows/procedures
└── Conversation analysis/data collection

ANTHROPIC
├── Screen understanding
├── ScreenEvent interpretation
├── Work Map synthesis/validation
├── Guardrail extraction
└── Semantic trainee evaluation
```

This division is the intended implementation boundary for the MVP and should be treated as the repository's working contract.
