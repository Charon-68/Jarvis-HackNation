# AI Apprentice — Support Triage Architecture

> **Status:** Hackathon MVP architecture  
> **Challenge:** 7th Global AI Hackathon — ElevenLabs × Hack-Nation — The AI Apprentice  
> **Chosen workflow:** Support-ticket triage / support escalation  
> **Primary product flow:** **Capture → Map → Teach**  
> **Build constraint:** 3 developers, approximately 12-hour implementation window  
> **Architecture principle:** Use native ElevenLabs capabilities for conversational work instead of rebuilding equivalent custom subsystems.

---

## 1. Purpose

`ARCHITECTURE.md` defines the technical structure of the AI Apprentice MVP, the data flow between its components, the ownership boundaries for the three developers, and the integration points between our application and the provided AI platforms.

It is intentionally more implementation-oriented than the other shared documents:

- `CONTEXT.md` = what the product is, why we are building it, scope and shared assumptions.
- `ARCHITECTURE.md` = how the product is structured, how data moves through it, and where each capability belongs.
- `WORKFLOW.md` = exact support-ticket cases, hidden rules, guardrails and demo script.
- `INTEGRATION.md` = concrete contracts, provider adapters, APIs, events and integration details.
- `README.md` = product overview, setup and how to run the project.

Before changing a cross-cutting interface, read `CONTEXT.md`, this file, `WORKFLOW.md`, and `INTEGRATION.md`.

---

# 2. Architectural Objective

The architecture must demonstrate the challenge's central idea:

> **The system must learn the expert's decisions and reasoning, not merely record their clicks.**

The system therefore separates the product into three functional modules:

```text
CAPTURE
  Expert works on support tickets
  + browser screen is observed
  + meaningful events are extracted
  + ElevenAgents asks targeted questions
        │
        ▼
MAP
  events + transcript + expert answers
  + ElevenLabs debrief flow
  + teach-back
  + verified Work Map
        │
        ▼
TEACH
  new hire works on an unseen ticket
  + screen/workflow state is observed
  + decision is evaluated
  + ElevenAgents coaches/intervenes
```

These are **product modules, not three independent autonomous agents**.

The MVP uses:

- **ElevenAgents / ElevenLabs** as the primary conversation, voice, coaching and conversation-analysis layer.
- **ElevenLabs Web SDK / Widget** to embed the conversational experience in the web application.
- **ElevenLabs Dynamic Variables + Client/Webhook Tools** to connect live application context and agent actions.
- **ElevenLabs multi-stage workflows/procedures** for structured debrief/teach-back.
- **ElevenLabs voice simulation/testing** where useful for trainee interaction.
- **Anthropic / Claude** as the primary multimodal perception and reasoning layer.
- **Frontend/browser APIs** for the Support Triage application, workflow state and screen capture.
- **A lightweight backend** for orchestration, persistence and deterministic decision enforcement.
- **Presidio** for practical privacy/redaction handling.

---

# 3. High-Level Architecture

```text
                                      ┌─────────────────────────┐
                                      │       WEB APP           │
                                      │  Support Triage UI     │
                                      │  Capture / Map / Teach  │
                                      └────────────┬────────────┘
                                                   │
                     ┌─────────────────────────────┼────────────────────────────┐
                     │                             │                            │
                     ▼                             ▼                            ▼
             Browser Screen Capture        ElevenLabs Web SDK/Widget      Work Map UI
                     │                             │                            ▲
                     ▼                             │                            │
               Frame Sampling                      │                            │
                     │                             │                            │
                     ▼                             │                            │
              Claude Vision                       │                            │
                     │                             │                            │
                     ▼                             │                            │
                ScreenEvent ────────┐             │                            │
                     │              │             │                            │
                     │              ▼             │                            │
                     │        Context Bridge ─────┼─────► ElevenAgents         │
                     │              │             │       Interviewer          │
                     │              │             │                            │
                     │              │             │       Dynamic Variables   │
                     │              │             │       Client/Webhook Tools│
                     │              │             │                            │
                     │              │             ▼                            │
                     │              │         Expert Answers                  │
                     │              │             │                            │
                     └──────────────┼─────────────┘                            │
                                    │                                          │
                                    ▼                                          │
                         Events + Transcript + Answers                         │
                                    │                                          │
                                    ▼                                          │
                              Debrief Flow                                    │
                         (ElevenLabs stages)                                  │
                                    │                                          │
                              Teach-back                                       │
                                    │                                          │
                         Expert confirmation/correction                       │
                                    │                                          │
                                    ▼                                          │
                         Claude / Knowledge Synthesis                          │
                                    │                                          │
                           ┌────────┴────────┐                                 │
                           │                 │                                 │
                           ▼                 ▼                                 │
                       WorkMap JSON     Guardrails / Rules                     │
                           │                 │                                 │
                           └────────┬────────┘                                 │
                                    ▼                                          │
                             Verified WorkMap ─────────────────────────────────┘
                                    │
                                    ▼
                             Tutor Knowledge
                                    │
                                    ▼
                             New-Hire Session
                                    │
                        ┌───────────┴────────────┐
                        │                        │
                        ▼                        ▼
                Screen / workflow state     ElevenAgents Tutor
                        │                        │
                        ▼                        │
                 Decision Evaluator ◄────────────┘
                        │
                   ┌────┴────┐
                   │         │
                Correct     Wrong
                   │         │
                continue     ▼
                          TutorIntervention
                               │
                  ┌────────────┴────────────┐
                  │                         │
                  ▼                         ▼
             Block Save              Voice Guidance
                  │                         │
                  └────────────┬────────────┘
                               ▼
                          New Hire Retry
                               │
                               ▼
                    Conversation Analysis /
                      Training Results
```

The intended architecture keeps the **application state and critical business rules in our system**, while delegating conversational behavior to ElevenLabs and multimodal perception/reasoning to Claude.

---

# 4. Core Architectural Principles

## 4.1 Capture meaningful events, not raw video knowledge

The primary knowledge representation is a stream of meaningful **ScreenEvents**.

A recording or selected screenshot can exist as evidence, but the reasoning pipeline should operate on events such as:

```text
00:08  Opened T001
00:18  Priority changed → P1
00:20  Team changed → Infrastructure
00:22  Action changed → Immediate escalation
```

Do not make the Work Map a transcript of video frames.

---

## 4.2 ElevenLabs owns the conversational layer

Do not build custom equivalents of capabilities already provided by ElevenLabs unless necessary for an integration limitation.

Prefer:

```text
ElevenAgents
    ├── interviewer
    ├── debrief
    ├── teach-back
    └── tutor
```

Use native ElevenLabs capabilities for:

```text
Web SDK / Widget
Dynamic Variables
Client / Webhook Tools
Multi-stage workflows / procedures
Voice simulation / testing
Conversation Analysis / Data Collection
```

Our code should supply workflow context and consume provider-neutral events/results rather than reimplementing voice turn-taking, TTS, STT or conversational orchestration.

---

## 4.3 Voice asks about decisions, not every action

The voice agent should remain quiet while the expert is actively working and ask short questions when:

- a meaningful decision has occurred;
- enough context is available;
- a useful pause exists;
- the same question has not just been asked;
- the question can reveal reasoning, exceptions or guardrails.

Examples:

```text
Why did you mark this P1?
Why did you stop normal troubleshooting here?
What would make you escalate this differently?
```

The arrival of an event is context for the agent, not automatic permission to speak.

---

## 4.4 Work Map is the canonical learned-knowledge artifact

The Work Map is the central object connecting Capture, Map and Teach.

```text
Capture
  ↓
ScreenEvents + ExpertAnswers
  ↓
Debrief + Teach-back
  ↓
WorkMap generation
  ↓
Verified WorkMap
  ↓
Tutor + Evaluation + UI
```

The Work Map must preserve:

- what happened;
- what decision was made;
- why the expert made it;
- guardrails;
- exceptions;
- teaching points;
- supporting evidence.

The tutor should consume the Work Map rather than independently reconstructing the expert's process from a raw transcript.

---

## 4.5 Deterministic safety-critical checks

Known workflow guardrails should be enforced with deterministic application/backend logic wherever possible.

LLMs can assist with semantic interpretation and explanation, but the system should not rely on an LLM alone for a critical `allow/block save` decision when the rule can be expressed deterministically.

Example:

```text
possible data loss
      ↓
required action = STOP + ESCALATE
      ↓
block unsafe save
      ↓
ElevenAgents explains why
```

Voice is a coaching layer, not the authorization layer.

---

## 4.6 Graceful degradation and fixture-first development

Every integration layer must have a mock/fixture mode.

The frontend must be able to render:

- mock `ScreenEvent[]`;
- mock `ExpertAnswer[]`;
- mock `WorkMap`;
- mock `TutorIntervention`;
- mock `AgentMessage`;
- mock agent status.

This allows all three developers to work in parallel before live integrations are complete.

---

# 5. Product Modules

## 5.1 Module 1 — Capture

### Goal

Observe an expert processing support tickets and capture the reasoning behind important decisions.

### Frontend experience

```text
┌───────────────────────────────────────────────────────────────┐
│ SUPPORT TRIAGE                                                │
├────────────────┬─────────────────────────┬────────────────────┤
│ OPEN TICKETS   │       ACTIVE TICKET     │ AI APPRENTICE      │
│                │                         │                    │
│ T001           │ T003                    │ ● Listening        │
│ T002           │ Customer: PQR Inc       │                    │
│ T003      ◀    │ Issue details...        │ "Why did you       │
│ T004           │                         │ stop normal        │
│ T005           │ Priority  [ P1 ]        │ troubleshooting?"  │
│ T006           │ Team      [Engineering] │                    │
│                │ Action    [STOP...]     │                    │
│                │                         │                    │
│                │ [ Save / Escalate ]     │                    │
├────────────────┴─────────────────────────┴────────────────────┤
│ Screen ●   Voice ●   Recording ●                              │
│ [Pause / Don't Record]                    [End Session]       │
└───────────────────────────────────────────────────────────────┘
```

### Capture architecture

```text
Browser Screen Capture
        │
        ├── workflow state
        │
        └── sampled frames
                │
                ▼
          Claude Vision
                │
                ▼
          ScreenEvent[]
                │
                ├──────────────► Session/Backend
                │
                ▼
       ElevenLabs context
                │
                ▼
          ElevenAgents
                │
                ▼
         Expert response
                │
                ▼
          ExpertAnswer
```

### Capture responsibilities

1. Start a session.
2. Request screen sharing explicitly.
3. Observe the visible workflow.
4. Produce meaningful `ScreenEvent`s.
5. Provide relevant events/context to ElevenAgents.
6. Allow ElevenAgents to ask at least three targeted live questions.
7. Associate answers with the event that triggered the question where possible.
8. Allow pause/off-record behavior.
9. End the session cleanly.

---

## 5.2 Module 2 — Map

### Goal

Transform the expert session into a verified, evidence-linked Work Map.

### Inputs

```text
ScreenEvents
+
Conversation transcript
+
Expert answers
+
Debrief answers
+
Teach-back confirmation
```

### Processing

```text
Session data
    ↓
Normalize / deduplicate
    ↓
Associate events with conversation turns
    ↓
ElevenLabs debrief flow
    ↓
Missing knowledge / exception questions
    ↓
Teach-back
    ↓
Expert confirmation/correction
    ↓
Claude knowledge synthesis
    ↓
WorkMap JSON
    ↓
Schema validation
    ↓
Persist
    ↓
Render clickable Work Map
```

### Debrief architecture

ElevenLabs should drive the conversational debrief through a structured multi-stage flow where practical:

```text
Stage 1
Review important decisions

Stage 2
Identify unanswered/uncertain reasoning

Stage 3
Probe exceptions and guardrails

Stage 4
Teach-back

Stage 5
Expert confirmation/correction

Stage 6
Return structured debrief knowledge
```

The exact implementation may follow the current ElevenLabs workflow/procedure mechanism available to the team.

### Work Map

```text
WorkMap
├── workflow metadata
├── expert metadata
├── summary
└── steps[]
    ├── timestamp
    ├── ticket
    ├── observed action
    ├── decision
    ├── expert reason
    ├── guardrails
    ├── exceptions
    ├── teaching point
    └── evidence
```

---

## 5.3 Module 3 — Teach

### Goal

Use the verified Work Map to coach a new employee on an unseen support case.

### Flow

```text
New Hire
   ↓
Open unseen ticket
   ↓
Inspect ticket
   ↓
Make decision
   ↓
Decision Evaluator
   ↓
┌───────────────┬─────────────────┐
│ correct       │ incorrect       │
│               │                 │
│ continue      │ block save      │
│               │ tutor explains  │
│               │ replay evidence │
└───────────────┴─────────────────┘
```

### Tutor architecture

```text
WorkMap
   +
Current trainee context
   +
Current ScreenEvents
        │
        ▼
   ElevenAgents Tutor
        │
        ├── ask prediction
        ├── explain
        ├── warn
        └── reinforce
```

The application/evaluator determines whether a known rule is violated. ElevenAgents handles the natural voice coaching.

---

# 6. Domain Architecture — Support Ticket Triage

The workflow is intentionally deterministic for the hackathon while retaining hidden judgment.

## 6.1 Ticket model

A support ticket contains at least:

```text
id
customer
issue
scope
category / issue type
status
available evidence
```

The expert can choose:

```text
priority
team
action
```

The expert's hidden rules are not shown as a policy document in the main workflow UI.

---

## 6.2 Demo tickets

| Ticket | Scenario | Intended decision |
|---|---|---|
| T001 | Production website completely down for all customers | P1 / immediate escalation / infrastructure or incident response |
| T002 | One employee cannot log in | P3 / support / normal troubleshooting |
| T003 | Customer data disappeared after today's update | P1 / engineering / STOP normal processing + escalate |
| T004 | Password reset request | P3 / support / send reset procedure |
| T005 | API returning errors for many customers | P1 / engineering / immediate engineering escalation |
| T006 | Dashboard slow for several customers | P2 / engineering / investigate performance |

These values form the deterministic demo baseline. The expert's explanation supplies the learned reasoning layer.

---

# 7. Golden Demo Architecture

The primary demo path should be deterministic.

## 7.1 Expert capture

```text
Expert starts session
       ↓
Shares screen
       ↓
Opens/processes support tickets
       ↓
Makes triage decisions
       ↓
Claude identifies meaningful screen changes
       ↓
ScreenEvents are normalized
       ↓
Relevant context enters ElevenAgents
       ↓
ElevenAgents waits for a useful pause
       ↓
Agent asks contextual questions
       ↓
Expert answers
```

## 7.2 Recommended knowledge-revealing questions

```text
Why did you mark T001 as P1?

Why did you stop normal troubleshooting on T003?

Would you treat a login problem the same way if only one employee is affected?

What changes if many customers report the same API error?

When would you stop and ask another team to take over?
```

The purpose is to reveal:

- impact;
- scope;
- systemic behavior;
- safety;
- escalation.

## 7.3 Debrief

```text
Session ends
    ↓
Freeze capture/event context
    ↓
ElevenLabs multi-stage debrief
    ↓
≥3 new follow-up questions
    ↓
Teach-back
    ↓
Expert confirms/corrects
    ↓
Structured knowledge
    ↓
Claude Work Map synthesis
```

## 7.4 New-hire test

Unseen case:

> **12 customers lost transaction history after an update.**

The trainee may initially choose:

```text
P3 / Support / Normal troubleshooting
```

The intended learned rule is:

```text
multiple customers
      +
possible data loss
      ↓
high-impact systemic issue
      ↓
P1 / Engineering / STOP + escalate
```

The evaluator blocks Save and ElevenAgents explains the rule using the expert's learned reasoning.

---

# 8. Screen Observation Architecture

## 8.1 Browser capture

Use browser-native screen capture.

```ts
const stream =
  await navigator.mediaDevices.getDisplayMedia(...);
```

The implementation must handle:

- user permission;
- cancelled share request;
- stream ending;
- pause recording;
- resume recording;
- clean session termination.

## 8.2 Frame strategy

The challenge brief suggests screen-frame analysis at approximately one-to-two-second intervals. The MVP may selectively sample frames or use lightweight change detection before calling Claude.

Preferred flow:

```text
Screen stream
    ↓
Sampling / change detection
    ↓
Meaningful change?
   /        \
 NO          YES
 │            │
ignore       frame
              ↓
          Claude Vision
              ↓
          ScreenEvent
```

Avoid repeatedly sending identical frames when no meaningful workflow state changed.

## 8.3 Hybrid event source

For the controlled fake Support Triage application, deterministic workflow state can support vision:

```text
Browser workflow state ───────┐
                              ├──► Event normalization ─► ScreenEvent
Sampled screenshot ─► Claude ┘
```

This is a **reliability layer**, not a replacement for the intended screen-understanding architecture.

---

# 9. Voice / ElevenLabs Architecture

ElevenLabs is the primary conversational subsystem.

## 9.1 Web SDK / Widget

The voice experience should be embedded into the Support Triage web application rather than implemented as a separate voice website.

```text
Support Triage UI
        │
        ├── ticket workspace
        │
        └── ElevenLabs Web SDK / Widget
                 │
                 ▼
             ElevenAgent
```

Person 1 owns the UI placement/integration surface.

Person 2 owns ElevenLabs-specific configuration and provider code.

## 9.2 Interviewer

Inputs:

```text
session context
current ticket context
recent ScreenEvents
capture status
conversation state
```

Behavior:

```text
active work
    ↓
stay quiet

meaningful decision
    ↓
wait for useful pause

context + question budget
    ↓
ask one concise question

expert answers
    ↓
record ExpertAnswer
```

Prioritize:

1. hidden reasoning;
2. guardrails;
3. exceptions;
4. escalation criteria.

## 9.3 Dynamic Variables

Use Dynamic Variables to expose concise application context.

Possible values:

```text
session_id
mode
current_ticket_id
current_ticket_scope
current_ticket_type
current_priority
current_team
current_action
latest_screen_event
capture_status
```

Example:

```json
{
  "current_ticket_id": "T003",
  "current_priority": "P1",
  "current_team": "Engineering",
  "current_action": "STOP + escalate",
  "latest_screen_event": "Expert changed action to STOP + escalate",
  "capture_status": "active"
}
```

Keep dynamic variables semantic and compact. Do not use them as long-term persistence.

## 9.4 Client Tools

Use Client Tools for browser/UI actions triggered by the voice agent where appropriate.

Examples:

```text
show_intervention()
open_workmap_step(step_id)
replay_expert_evidence(step_id)
highlight_ticket(ticket_id)
show_notification(message)
```

Client tools are not the system of record for business state.

## 9.5 Webhook / server-side tools

Use Webhook/server-side tools for backend operations such as:

```text
get_relevant_workmap_rule
evaluate_training_decision
persist_agent_event
get_session_context
```

Server-side persistence and critical evaluation remain under our backend/application boundary.

## 9.6 Debrief / multi-stage flow

Use ElevenLabs' workflow/procedure/multi-stage capabilities to orchestrate:

```text
Review
  ↓
Gap detection
  ↓
Guardrail probing
  ↓
Teach-back
  ↓
Expert confirmation
```

The flow should emit structured results or `ExpertAnswer` records into the shared contract.

## 9.7 Tutor

The tutor receives:

```text
WorkMap
current ticket
current ScreenEvents
current trainee decision
TutorIntervention when applicable
```

The tutor can:

- ask a prediction question;
- explain the expert's reasoning;
- reference a guardrail;
- trigger replay of expert evidence;
- reinforce the correction.

## 9.8 Voice simulation / testing

Where useful, use ElevenLabs' interactive voice simulation/testing capabilities for trainee-facing conversational tests.

This does not replace the real Support Triage training UI or the deterministic evaluator.

## 9.9 Conversation Analysis / Data Collection

Use native ElevenLabs conversation analysis/data collection for structured post-session signals where useful.

Possible result fields:

```text
live_question_count
guardrail_question_asked
debrief_question_count
teach_back_completed
expert_confirmation
tutor_intervention_count
training_success
```

Application-level results may combine these with deterministic workflow/evaluation results.

---

# 10. Work Map Architecture

## 10.1 Work Map as canonical knowledge representation

```text
WorkMap
├── workflow metadata
├── expert metadata
├── summary
├── global guardrails / exceptions
└── steps[]
    ├── timestamp
    ├── ticket
    ├── observed action
    ├── decision
    ├── expert reason
    ├── guardrails
    ├── exceptions
    ├── teaching point
    ├── source event IDs
    └── evidence reference
```

## 10.2 Generation

```text
ScreenEvents
    +
ExpertAnswers
    +
Debrief answers
    +
Teach-back confirmation
        ↓
Claude / structured reasoning
        ↓
WorkMap JSON
        ↓
Schema validation
        ↓
Persist
```

## 10.3 Verification

The generated Work Map must not claim expert confirmation until the expert has actually confirmed or corrected the teach-back.

Unsupported or uncertain rules should be marked as uncertain rather than invented.

---

# 11. Decision Evaluation Architecture

The evaluator answers:

> **Is the new hire's current decision compatible with what the expert taught?**

## 11.1 Evaluation pipeline

```text
New-hire current state
       +
Workflow state
       +
WorkMap / learned guardrails
       ↓
Decision evaluator
       ↓
Evaluation result
       ↓
allow save / intervention
```

## 11.2 Hybrid strategy

### Layer 1 — deterministic checks

Examples:

```text
if possible_data_loss:
    required_action = STOP + ESCALATE

if all_customers_affected:
    expected_priority = P1

if many_customers_affected:
    expected_team = ENGINEERING / INCIDENT RESPONSE
```

### Layer 2 — Claude assistance

Claude can help with:

- interpreting ambiguous trainee behavior;
- explaining why a choice conflicts with learned knowledge;
- selecting relevant Work Map evidence;
- generating natural-language reasoning.

The LLM should not silently invent a new policy.

## 11.3 Intervention

```text
Decision attempt
      ↓
Evaluator = incorrect
      ↓
Block Save
      ↓
Create TutorIntervention
      ↓
ElevenAgents speaks
      ↓
Show/replay expert evidence
      ↓
New hire corrects
      ↓
Re-evaluate
```

---

# 12. Frontend Architecture

Person 1 owns the product/UI layer.

## 12.1 Main routes / views

```text
/                  Dashboard
/expert             Expert Capture
/debrief            Debrief / teach-back state
/work-map           Work Map
/training           New-Hire Training
/results            Training Results
```

The exact route names may follow the existing repository.

## 12.2 Major frontend components

```text
AppShell
├── Navigation
├── SessionHeader
├── TicketQueue
├── TicketDetail
├── DecisionPanel
├── AICompanionPanel
├── AgentStatus
├── EventTimeline
├── WorkMapTimeline
├── WorkMapStepCard
├── EvidenceViewer
├── TrainingWorkspace
├── TutorIntervention
├── RecordingControls
├── PrivacyControls
└── TrainingResults
```

## 12.3 Frontend state

The frontend should maintain explicit session state such as:

```text
sessionId
mode: expert | training
sessionPhase
captureStatus
selectedTicketId
currentTicket
currentDecision
screenEvents
agentStatus
latestQuestion
transcript/messages
workMap
intervention
```

Avoid hiding all session state inside unrelated UI components.

---

# 13. Backend / Orchestration Architecture

The backend is intentionally lightweight.

Its job is to provide stable boundaries, deterministic decision enforcement, persistence and server-side provider orchestration.

## 13.1 Logical services

```text
backend/
├── session service
├── screen-event service
├── work-map service
├── evaluation service
├── privacy service
├── provider adapters
└── storage
```

## 13.2 Backend responsibilities

The backend should:

- persist session state;
- persist ScreenEvents;
- persist ExpertAnswers;
- validate WorkMap output;
- store/retrieve WorkMaps;
- evaluate deterministic guardrails;
- return TutorInterventions;
- expose safe provider integration endpoints;
- isolate provider secrets from the frontend.

The backend should not become a second conversational agent framework.

---

# 14. Integration Boundaries Between the 3 Developers

## Person 1 — Frontend / Product

Owns:

```text
support-ticket UI
Expert Capture UI
screen-sharing UX
ElevenLabs Widget/SDK placement
Work Map UI
evidence replay
training UI
intervention UI
results UI
```

Consumes:

```text
ScreenEvent[]
ExpertAnswer[]
WorkMap
TutorIntervention
AgentMessage
AgentStatus
```

Does not own:

```text
Claude API implementation
ElevenLabs agent configuration
Work Map generation
backend intelligence
provider secrets
```

---

## Person 2 — ElevenLabs / Conversation

Owns:

```text
ElevenAgents
interviewer
question behavior
Dynamic Variables
Client/Webhook Tools
debrief
teach-back
tutor
voice simulation/testing
conversation analysis/data collection
```

Consumes:

```text
screen/workflow context
ScreenEvents
WorkMap
TutorIntervention
```

Produces:

```text
AgentMessage
ExpertAnswer
agent status
structured conversational results
```

Does not own frontend component internals or database implementation.

---

## Person 3 — Vision / Reasoning / Backend

Owns:

```text
Claude Vision
ScreenEvent generation
event normalization
WorkMap synthesis
guardrail extraction
decision evaluator
deterministic rules
storage
privacy/Presidio
backend APIs
```

Consumes:

```text
screenshots
workflow state
ExpertAnswers
session metadata
```

Produces:

```text
ScreenEvents
WorkMap
TutorIntervention
evaluation results
persistence APIs
```

---

# 15. Shared Contracts

The exact canonical definitions should live in `shared/types.ts` and be documented in `INTEGRATION.md`.

Core objects:

```text
Session
ScreenEvent
ExpertAnswer
WorkMapStep
WorkMap
DecisionAttempt
TutorIntervention
CaptureState
AgentMessage
```

Provider-specific objects should not leak into these contracts.

The frontend should not require ElevenLabs' internal message schema.

The backend should not require React state structures.

Claude request/response formats should remain inside the Anthropic adapter.

---

# 16. Event Flow Details

## 16.1 Capture path

```text
Browser screen
     ↓
Frame sampling
     ↓
Claude Vision
     ↓
ScreenEvent
     ↓
Backend/session context
     ↓
ElevenLabs Dynamic Variables / Client Tool context
     ↓
ElevenAgents
```

## 16.2 Voice answer path

```text
Expert speaks
     ↓
ElevenAgents
     ↓
Transcript / answer
     ↓
Provider adapter
     ↓
ExpertAnswer
     ↓
Associate with current ScreenEvent
     ↓
Backend / Work Map input
```

## 16.3 Debrief path

```text
Capture ends
     ↓
Session context frozen
     ↓
ElevenLabs multi-stage debrief
     ↓
ExpertAnswer[]
     ↓
Teach-back
     ↓
Expert confirmation/correction
     ↓
Structured knowledge
```

## 16.4 Work Map path

```text
ScreenEvents
    +
ExpertAnswers
    +
Debrief answers
    +
Workflow metadata
    ↓
Claude
    ↓
WorkMap
    ↓
Validation
    ↓
Persist
    ↓
Frontend Work Map
```

## 16.5 Training path

```text
Trainee workflow state
       ↓
DecisionAttempt
       ↓
Deterministic evaluator
       ↓
correct? ───────────────► allow Save
       │
       ▼
TutorIntervention
       │
       ├── frontend block
       ├── ElevenAgents voice
       └── evidence replay
```

---

# 17. Provider Adapter Architecture

All provider-specific logic should be isolated behind adapters.

## 17.1 VoiceAgentAdapter

```ts
interface VoiceAgentAdapter {
  connect(input: {
    sessionId: string;
    mode: "interviewer" | "tutor";
  }): Promise<void>;

  disconnect(): Promise<void>;

  updateContext(
    context: Record<string, unknown>
  ): Promise<void>;

  sendScreenEvent(
    event: ScreenEvent
  ): Promise<void>;

  sendWorkMap(
    workMap: WorkMap
  ): Promise<void>;

  sendIntervention(
    intervention: TutorIntervention
  ): Promise<void>;

  onMessage(
    callback: (message: AgentMessage) => void
  ): () => void;

  onStatusChange(
    callback: (status: string) => void
  ): () => void;
}
```

The exact ElevenLabs Web SDK/Widget, Dynamic Variable, Client Tool, Webhook, Workflow/Procedure and Conversation Analysis calls remain inside this adapter.

## 17.2 VisionAdapter

```ts
interface VisionAdapter {
  analyzeFrame(input: {
    sessionId: string;
    timestampMs: number;
    image: Blob | ImageBitmap;
    priorEvent?: ScreenEvent;
    workflowContext?: Record<string, unknown>;
  }): Promise<ScreenEvent | null>;
}
```

Claude-specific request handling remains inside this adapter.

## 17.3 EvaluationAdapter

```ts
interface EvaluationAdapter {
  evaluate(
    attempt: DecisionAttempt,
    workMap: WorkMap
  ): Promise<{
    allowSave: boolean;
    intervention: TutorIntervention | null;
  }>;
}
```

Deterministic critical rules should be evaluated before optional semantic reasoning.

---

# 18. ElevenLabs ↔ Application Context

The application should expose only the context needed by the voice agent.

```text
Application State
    │
    ├── current ticket
    ├── current priority
    ├── current team
    ├── current action
    ├── capture state
    └── latest meaningful event
            │
            ▼
   Dynamic Variables / Client Tools
            │
            ▼
       ElevenAgents
```

Do not continuously push:

- raw screenshots;
- complete application state dumps;
- secrets;
- internal database records.

Use semantic context.

---

# 19. ElevenLabs Tooling Rules

## Client-side actions

Use Client Tools for:

```text
show intervention
open evidence
replay evidence
highlight ticket
navigate to Work Map step
show notification
```

## Server-side actions

Use Webhook/server tools for:

```text
retrieve relevant Work Map rule
evaluate decision
retrieve session context
persist structured event
```

## MCP

MCP is optional and not required for the core architecture.

Potential future tool:

```text
get_guardrail(step_id)
```

The system must not depend on MCP for the golden demonstration.

---

# 20. Work Map Knowledge Boundary

The Work Map is the boundary between **learning** and **teaching**.

### Capture/Map writes:

```text
observations
+
expert explanations
+
validated guardrails
```

### Teach reads:

```text
learned rules
+
examples
+
evidence
+
teaching points
```

This prevents the tutor from treating an arbitrary raw conversation as authoritative knowledge.

---

# 21. Decision Evaluation Boundary

The critical save decision belongs to the application/backend.

```text
Trainee decision
      ↓
Deterministic evaluator
      ↓
allowSave
```

Then:

```text
allowSave = true
    ↓
commit

allowSave = false
    ↓
TutorIntervention
    ↓
ElevenAgents
```

This ensures ElevenLabs latency cannot accidentally allow an unsafe demo decision to be persisted.

---

# 22. Privacy Architecture

The challenge explicitly requires off-record control and credible PII protection.

## 22.1 User control

Frontend provides:

```text
[ Pause / Don't Record ]
```

State:

```text
active → paused → active
```

While paused:

- screen-event processing stops;
- capture processing pauses;
- UI visibly communicates paused status;
- the voice layer is informed where practical.

## 22.2 Redaction

```text
Captured frame / transcript
        ↓
     Presidio
        ↓
Redacted representation
        ↓
Backend / downstream AI
```

## 22.3 Data minimization

Prefer storing:

- structured ScreenEvents;
- selected evidence;
- necessary transcript;
- redacted artifacts.

Do not make raw full-screen video the canonical knowledge store.

---

# 23. Storage Architecture

The MVP needs lightweight persistence.

Suggested logical entities:

```text
sessions
screen_events
expert_answers
work_maps
work_map_steps
training_sessions
training_decisions
interventions
conversation_results
```

Provider-native conversation data may remain in the provider where appropriate, but our application should persist the canonical workflow/knowledge objects it needs for the product.

Fixture-backed development must remain supported.

---

# 24. Performance and Cost Strategy

The provided Anthropic credit is finite and the demo is small.

### Claude

- avoid redundant screenshot analysis;
- use selective sampling/change detection;
- keep vision prompts concise;
- use deterministic workflow state to support event extraction for the controlled demo;
- generate Work Maps after the task rather than on every event;
- avoid resending the entire transcript unnecessarily.

### ElevenLabs

- keep interviewer questions short;
- avoid unnecessary conversational turns;
- use the agent for high-value questions rather than routine UI narration;
- keep the debrief focused;
- use native ElevenLabs workflows rather than custom orchestration where practical.

### Frontend

- do not block ticket interaction while a voice call is being processed;
- do not let provider latency determine critical save behavior;
- keep evidence/replay local or fixture-backed when possible.

---

# 25. Mock and Fixture Architecture

Mock mode is a first-class architecture component.

Recommended adapters:

```text
MockScreenEventProvider
MockVoiceAgent
MockWorkMapProvider
MockDecisionEvaluator
MockConversationAnalysis
```

Recommended fixtures:

```text
fixtures/
├── expert-session.json
├── screen-events.json
├── expert-answers.json
├── work-map.json
├── trainee-case.json
├── tutor-intervention.json
└── conversation-results.json
```

The fixtures must use the same shared contracts as live providers.

---

# 26. State Machines

## 26.1 Expert session

```text
IDLE
  ↓
STARTING
  ↓
SCREEN_REQUEST
  ├── cancelled → IDLE
  ↓
CAPTURING
  ├── pause → PAUSED
  │            └── resume → CAPTURING
  │
  └── end → DEBRIEF
              ↓
          TEACH_BACK
              ↓
       EXPERT_CONFIRMATION
              ↓
        WORKMAP_GENERATION
              ↓
          WORKMAP_READY
```

## 26.2 New-hire training

```text
READY
  ↓
IN_PROGRESS
  ↓
DECISION_ATTEMPT
  ├── correct → CONTINUE
  │
  └── incorrect → INTERVENTION
                       ↓
                   CORRECTION
                       ↓
                  RE-EVALUATE
                       ↓
                    CONTINUE
                       ↓
                   COMPLETE
```

---

# 27. Failure and Recovery Behavior

## Screen sharing fails

Show:

```text
Screen sharing unavailable
[Try Again]
```

Do not crash the session.

## Claude Vision fails

Preserve the session. Retry or use the controlled workflow-state signal as fallback.

## ElevenLabs fails

Preserve workflow/session state and show:

```text
Voice temporarily unavailable
```

During development, switch to mock mode.

## ElevenLabs tool call fails

The application workflow state must remain valid. A failed tool call must not corrupt the Work Map or decision state.

## Debrief flow fails

Preserve captured answers/events and allow retry or fixture fallback.

## Work Map generation fails

Preserve the source data and allow regeneration.

## Conversation Analysis fails

Core training correctness must still be available from deterministic evaluation; conversation analytics are supplementary.

## Evaluator fails

Known critical demo guardrails should still have deterministic fallback enforcement where possible.

## Browser screen share unexpectedly ends

Transition capture to an error/stopped state and allow retry.

---

# 28. Security / Secrets

Provider secrets must never be committed to the repository or exposed in frontend source.

Logical environment variables may include:

```env
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_AGENT_ID=
DATABASE_URL=
```

Additional variables should be added only when required.

Do not place secrets in:

- README;
- CONTEXT;
- ARCHITECTURE;
- WORKFLOW;
- fixtures;
- screenshots;
- recordings;
- frontend bundles.

---

# 29. Observability

Use structured identifiers across all layers:

```text
sessionId
eventId
ticketId
workMapId
trainingSessionId
agentConversationId
attemptId
```

Example:

```text
[session=abc123]
[event=evt_42]
[ticket=T003]
priority_changed P3 -> P1
```

Do not log sensitive raw screen content or secrets.

---

# 30. Three-Developer Architecture

The repository is divided by technical layer rather than by Capture/Map/Teach.

```text
                         SHARED CONTRACTS
                                │
               ┌────────────────┼────────────────┐
               │                │                │
               ▼                ▼                ▼
          PERSON 1          PERSON 2          PERSON 3
          Frontend          ElevenLabs       Vision/Backend
               │                │                │
               └────────────────┼────────────────┘
                                │
                          Integrated MVP
```

## Person 1

Owns:

- Support Triage UI;
- Expert Capture UI;
- screen-sharing UX;
- ElevenLabs Widget/SDK integration surface;
- Work Map UI;
- evidence replay;
- training UI;
- intervention UI;
- results UI.

## Person 2

Owns:

- ElevenAgents interviewer;
- live question behavior;
- Dynamic Variables;
- Client/Webhook Tools;
- debrief workflow;
- teach-back;
- tutor;
- voice simulation/testing;
- Conversation Analysis/Data Collection;
- ElevenLabs provider adapter.

## Person 3

Owns:

- Claude Vision;
- ScreenEvent extraction;
- Work Map generation;
- guardrail extraction;
- decision evaluator;
- deterministic rules;
- storage;
- backend;
- Presidio;
- Anthropic provider adapter.

---

# 31. Integration-First Development Strategy

The team must be able to run the product before every provider is connected.

### Stage 1 — Freeze contracts

Freeze:

```text
ScreenEvent
ExpertAnswer
WorkMap
WorkMapStep
DecisionAttempt
TutorIntervention
AgentMessage
adapter interfaces
```

### Stage 2 — Fixture mode

All screens and agents work against deterministic fixtures.

### Stage 3 — Frontend

Person 1 completes Capture → Map → Teach navigation without live AI.

### Stage 4 — ElevenLabs

Person 2 connects:

```text
Web SDK / Widget
Dynamic Variables
Client Tools
Interviewer
Debrief
Tutor
Analysis
```

### Stage 5 — Claude

Person 3 connects:

```text
Vision
Work Map synthesis
guardrail extraction
semantic evaluation
```

### Stage 6 — Event/context bridge

Connect:

```text
ScreenEvents
    ↓
context bridge
    ↓
ElevenAgents
```

### Stage 7 — Work Map

Connect:

```text
events + conversation
    ↓
Claude
    ↓
WorkMap
    ↓
frontend
```

### Stage 8 — Training

Connect:

```text
new hire
    ↓
decision attempt
    ↓
evaluator
    ↓
TutorIntervention
    ↓
ElevenAgents + UI
```

### Stage 9 — Privacy / polish

Add:

- pause/off-record;
- Presidio;
- replay;
- error states;
- final demo polish.

---

# 32. Architectural Tradeoffs

## Why use ElevenLabs heavily?

Because the challenge is fundamentally conversational and the supplied platform already provides:

- voice-agent interaction;
- embedded web voice experience;
- context variables;
- client/server tools;
- multi-stage conversational orchestration;
- trainee voice simulation/testing;
- conversation analysis.

Rebuilding these would add unnecessary integration risk during a 12-hour hackathon.

## Why still use Claude?

Claude fills a different role:

- screen perception;
- visual state understanding;
- Work Map synthesis;
- semantic guardrail reasoning;
- ambiguity handling.

There is no need to force all intelligence into the voice-agent model.

## Why use deterministic rules?

Because the controlled Support Triage workflow contains explicit critical conditions where reproducibility matters more than open-ended model judgment.

## Why build our own Support Triage app?

Because a deterministic fake workflow gives:

- controlled UI states;
- repeatable screen observations;
- deterministic correct/incorrect choices;
- no external system dependency;
- predictable live demo behavior.

---

# 33. What Is Intentionally Out of the Critical Path

```text
Bright Data integration
WebArena integration
O*NET runtime integration
MCP-based guardrail lookup
Multi-expert comparison
Always-on apprentice
Broad enterprise ticket connectors
Autonomous support-platform actions
Fine-tuning
Large-scale RAG
Production-grade enterprise identity/auth
General multi-workflow support
```

They may be mentioned as future extensions, but the MVP must not depend on them.

---

# 34. Final Architectural Success Criteria

The architecture is successful when this complete sequence works:

```text
EXPERT
  ↓
Share screen
  ↓
Process support tickets
  ↓
Meaningful ScreenEvents
  ↓
ElevenAgents receives context
  ↓
Agent asks ≥3 contextual questions
  ↓
Expert answers
  ↓
ElevenLabs debrief
  ↓
≥3 additional follow-ups
  ↓
Teach-back
  ↓
Expert confirms/corrects
  ↓
Claude synthesizes WorkMap
  ↓
WorkMap displayed
  ↓
NEW HIRE
  ↓
Unseen support case
  ↓
New hire makes wrong decision
  ↓
Deterministic evaluator catches it
  ↓
Save blocked
  ↓
ElevenAgents Tutor explains
  ↓
Expert evidence replayed
  ↓
New hire corrects decision
  ↓
Training result / analysis shown
```

The architecture should always be judged against this path.

---

# 35. Non-Negotiable Architectural Rules

1. **Do not turn the project into a generic chatbot.**
2. **Do not replace Capture → Map → Teach with a static tutorial.**
3. **Do not make the Work Map a plain transcript.**
4. **Do not reveal hidden expert rules as explicit workflow policy before they are learned.**
5. **Do not rely exclusively on an LLM for critical demo guardrails when deterministic checks are available.**
6. **Do not rebuild ElevenLabs capabilities that already satisfy the requirement.**
7. **Do not make Bright Data, WebArena, O*NET or MCP dependencies for the core demo.**
8. **Do not couple Person 1's frontend directly to Claude internals.**
9. **Do not couple Person 2's agent code directly to React component internals.**
10. **Use provider-neutral adapters and shared contracts.**
11. **The Work Map is the canonical learned-knowledge artifact.**
12. **Every important learned decision should have supporting evidence.**
13. **The tutor must teach from the Work Map, not invent expert rules.**
14. **Critical trainee save/block behavior belongs to the application/evaluator boundary.**
15. **Provider latency or voice failure must not corrupt business/workflow state.**
16. **All three developers must be able to work in fixture/mock mode.**
17. **No provider secrets are committed.**
18. **The final demo must contain an unseen case and a pre-save intervention.**
19. **Optional capabilities must never be able to break the golden path.**
20. **Keep the architecture simple enough for a reliable live demonstration.**

---

# 36. Final Architecture Summary

```text
                         AI APPRENTICE

             ┌───────────────┼────────────────┐
             │               │                │
           CAPTURE          MAP              TEACH
             │               │                │
             ▼               ▼                ▼
       Screen + Voice   Verified WorkMap   New Hire + Tutor
             │               │                │
             │               │                │
             ▼               │                ▼
       Claude Vision          │          Decision Evaluator
             │                │                │
             ▼                │                ▼
        ScreenEvents ─────────┘         TutorIntervention
             │
             ▼
       ElevenAgents
             │
     ┌───────┼────────┬────────────────┐
     │       │        │                │
 Interviewer Debrief Tutor      Conversation Analysis
     │       │        │
     └───────┴────────┘
             │
       Dynamic Variables
       Client/Webhook Tools
             │
             ▼
        Web Application
```

The architectural division is:

> **Person 1 owns what the user sees. Person 2 owns how the Apprentice speaks and listens. Person 3 owns how the system perceives, reasons and persists.**

And the platform division is:

> **Lovable builds the product surface. ElevenLabs powers conversation. Claude provides multimodal perception and reasoning. Presidio provides privacy. Deterministic application logic protects the critical save path.**

The architecture is intentionally narrow:

**one Support Triage workflow + one expert learning session + one verified Work Map + one unseen new-hire evaluation.**
