# AI Apprentice — Support Triage Workflow

> **Status:** Canonical workflow specification for the hackathon MVP
>
> **Challenge:** 7th Global AI Hackathon — ElevenLabs × Hack-Nation — **The AI Apprentice**
>
> **Chosen workflow:** Support-ticket triage / support escalation
>
> **Product path:** Capture → Map → Teach
>
> **Purpose:** This file is the single source of truth for the support-triage domain, demo cases, hidden reasoning, guardrails, conversational stages, Work Map targets, and new-hire evaluation scenario.

---

## 1. What This Workflow Is For

The challenge uses invoice processing as its running example, but explicitly allows teams to choose another knowledge-driven desk workflow. Our project uses **support-ticket triage**.

The product is not intended to automate support ticket handling end-to-end. The objective is to demonstrate that an AI Apprentice can:

1. watch an experienced support engineer work;
2. notice meaningful decisions on the screen;
3. ask why the expert made those decisions;
4. learn the expert's reasoning, exceptions and guardrails;
5. verify its understanding through a debrief and teach-back;
6. convert that knowledge into a Work Map; and
7. use that Work Map to teach a new employee on a fresh case.

The workflow therefore exists to demonstrate **knowledge transfer**, not generic ticket automation.

### Implementation principle

The workflow is intentionally designed around the capabilities provided by ElevenLabs:

- **ElevenAgents** handles voice interaction.
- **Dynamic Variables** provide concise live ticket/workflow context.
- **Client/Webhook Tools** connect the voice agent to the frontend/backend where necessary.
- **Multi-stage agent flows/workflows/procedures** structure the debrief and teach-back.
- **Interactive voice simulation/testing** supports trainee voice interaction.
- **Conversation Analysis/Data Collection** can provide structured post-session conversational results.
- **Claude** handles screen understanding, Work Map synthesis and semantic reasoning.
- The application keeps deterministic workflow state and critical Save/Block behavior.

Do not rebuild a custom speech, TTS, conversational orchestration, or debrief subsystem when the ElevenLabs platform already satisfies that requirement.

---

# 2. Product Workflow at a Glance

```text
                          EXPERT MODE
                               │
                               ▼
                     Support Ticket Queue
                               │
                               ▼
                           Open Ticket
                               │
                               ▼
                      Inspect issue + scope
                               │
                               ▼
                  Choose Priority / Team / Action
                               │
                               ▼
                         Save / Escalate
                               │
                               ▼
                          Repeat cases
                               │
                               ▼
                            DEBRIEF
                               │
                  ElevenLabs multi-stage flow
                               │
                  ┌────────────┴────────────┐
                  │                         │
           Missing knowledge          Teach-back
                  │                         │
                  ▼                         ▼
          Follow-up questions      Expert confirms/corrects
                  └────────────┬────────────┘
                               ▼
                          WORK MAP
                               │
                               ▼
                           TEACH MODE
                               │
                               ▼
                     New / unseen case
                               │
                               ▼
                        New hire decides
                               │
                               ▼
                       Decision evaluator
                               │
                     ┌─────────┴─────────┐
                     │                   │
                  Correct               Wrong
                     │                   │
                 Continue                ▼
                              Tutor intervention
                                      │
                           ┌──────────┴──────────┐
                           │                     │
                           ▼                     ▼
                       Block save          Voice guidance
                           │                     │
                           └──────────┬──────────┘
                                      ▼
                                New hire retries
```

---

# 3. The Support Triage Application

The reference demo uses a deliberately simple support-triage web application.

The visual layout is:

```text
┌──────────────────────────────────────────────────────────────┐
│ Support Triage                                               │
│ Experienced support engineer workspace                       │
├─────────────────┬────────────────────────┬───────────────────┤
│ OPEN TICKETS    │ ACTIVE TICKET          │ AI APPRENTICE     │
│                 │                        │                   │
│ T001  ABC Corp  │ Ticket T001            │ ElevenAgents      │
│ T002  XYZ Ltd   │ Customer: ABC Corp     │                   │
│ T003  PQR Inc   │ Issue: ...             │ Listening quietly │
│ T004  DEF Ltd   │ Scope: ...             │ while you work... │
│ T005  LMN Corp  │                        │                   │
│ T006  QRS Ltd   │ Priority    [ P1 ]     │                   │
│                 │ Team        [ ... ]     │                   │
│                 │ Action      [ ... ]     │                   │
│                 │                        │                   │
│                 │             [ SAVE ]   │                   │
├─────────────────┴────────────────────────┴───────────────────┤
│ Session recording • timer                         SCREEN+VOICE│
└──────────────────────────────────────────────────────────────┘
```

This layout is intentionally simple.

- **Left:** ticket queue.
- **Center:** expert's working surface.
- **Right:** ElevenLabs-powered AI Apprentice interaction.
- **Bottom:** recording/session controls.

The expert should visibly make decisions using the ticket workspace. The Apprentice should not need a separate complicated application to demonstrate its behavior.

---

# 4. Ticket Data Model

Each support ticket contains at least:

- Ticket ID
- Customer
- Issue
- Scope
- Priority
- Team
- Action
- Expert reasoning / hidden rule

The ticket UI should expose the operational information required for the expert's decision.

The **Expert reasoning / hidden rule is knowledge to be discovered by the Apprentice and should not be presented as an explicit rule on the main task UI.**

The application may additionally maintain internal metadata used for deterministic evaluation, such as whether a ticket represents:

- full outage;
- multiple-customer impact;
- possible data loss;
- isolated user issue.

That metadata is implementation state and must not be presented as an explicit answer during the expert learning session.

---

# 5. Canonical Expert Ticket Set

These six tickets come directly from the shared Support Triage workflow spreadsheet.

| Ticket | Customer | Issue | Scope | Intended Priority | Intended Team | Intended Action | Expert Reasoning / Hidden Rule |
|---|---|---|---|---|---|---|---|
| **T001** | ABC Corp | Production website completely down | All customers | **P1** | Infrastructure | **Immediate escalation** | Full production outage affects everyone → P1 and immediate escalation. |
| **T002** | XYZ Ltd | One employee cannot log in | Single user | **P3** | Support | **Normal troubleshooting** | Single-user login issue is routine unless other users are affected. |
| **T003** | PQR Inc | Customer data disappeared after today's update | Potential data loss | **P1** | Engineering | **STOP normal processing + escalate** | Possible data loss is a guardrail: do not ask the customer to modify/retry data; escalate. |
| **T004** | DEF Ltd | Password reset request | Single user | **P3** | Support | **Send reset procedure** | Routine request; no escalation needed. |
| **T005** | LMN Corp | API returning errors for many customers | Multiple customers | **P1** | Engineering | **Immediate escalation** | Multi-customer API failure indicates a system-wide incident. |
| **T006** | QRS Ltd | Dashboard is slow for several customers | Multiple customers | **P2** | Engineering | **Investigate performance** | One slow customer can be routine; multiple customers → possible system-wide performance issue. |

### Important

These values are the **expected outcomes for the controlled hackathon workflow**. They are not being presented as a universal real-world support policy.

The expert's spoken explanation is the source of the hidden reasoning the Apprentice is supposed to learn.

---

# 6. Knowledge the Apprentice Must Learn

The important information is not simply the final values in the ticket table. The Apprentice must learn the reasoning behind them.

## 6.1 Scope-first reasoning

The expert checks whether the problem affects:

- one user/customer;
- several customers; or
- everyone / the entire service.

The Work Map target is:

> **Always determine scope before priority.**

Expected expert wording:

> "I first check whether one customer or everyone is affected."

---

## 6.2 Full production outage

T001 demonstrates:

```text
Whole production service down
        ↓
Affects everyone
        ↓
P1
        ↓
Immediate escalation
```

Teaching point:

> **P1 is driven by impact, not just the wording of the complaint.**

---

## 6.3 Single-user issue

T002 demonstrates:

```text
One employee affected
        ↓
Isolated issue
        ↓
P3
        ↓
Normal support troubleshooting
```

Important exception:

An apparently simple issue should not be treated as permanently routine if evidence of wider impact appears.

---

## 6.4 Possible data loss — safety guardrail

T003 is the most important guardrail in the demo.

```text
Customer data may have disappeared
        ↓
Potential data loss
        ↓
P1 + Engineering
        ↓
STOP normal processing
        ↓
Escalate
```

Expected expert reasoning:

> "Possible data loss means we stop and escalate. We don't ask the customer to modify or retry data."

Teaching point:

> **Protect evidence/data before troubleshooting.**

This is the clearest example of a **stop condition** in the workflow.

---

## 6.5 Multi-customer API failure

T005 demonstrates systemic impact:

```text
Many customers affected
        ↓
Likely systemic issue
        ↓
P1
        ↓
Engineering
        ↓
Immediate escalation
```

Teaching point:

> **Use scope to distinguish local vs systemic issues.**

---

## 6.6 Multi-customer performance issue

T006 demonstrates that multiple reports can change severity even when the issue is not a complete outage:

```text
Several customers affected
        ↓
Possible system-wide performance problem
        ↓
P2
        ↓
Engineering
        ↓
Investigate performance
```

Teaching point:

> **Repeated reports change the severity.**

---

# 7. Expert Capture Session

The Capture phase should feel like the expert is simply doing their normal work while the Apprentice quietly observes.

The challenge requires:

- at least **3 live questions**;
- each question related to something visible on screen;
- questions asked at useful pauses;
- at least **1 live question about a guardrail**.

## 7.1 Recommended expert sequence

A deterministic demo should process the tickets in this order:

```text
T001 → T002 → T003 → T005 → T006
```

T004 can be used as an additional routine example if time permits, but it is not required for the core golden sequence.

The selected order intentionally provides contrast:

```text
T001  whole-service outage
T002  isolated issue
T003  safety/guardrail case
T005  systemic API incident
T006  multi-customer performance issue
```

This gives the Apprentice enough evidence to learn scope, severity and stop/escalation logic.

---

# 8. Conversational Architecture During Capture

The interviewer is implemented through **ElevenAgents**.

The expected flow is:

```text
Screen/workflow state
       ↓
Semantic ScreenEvent
       ↓
Context supplied to ElevenAgents
       ↓
ElevenAgents considers:
  - current decision
  - recent event
  - expert activity
  - previous questions
  - knowledge gaps
       ↓
Natural pause?
       ↓
Ask one concise question
       ↓
Expert answers
       ↓
Record ExpertAnswer
```

Use ElevenLabs' native:

- Web SDK / Widget;
- Dynamic Variables;
- Client Tools / Webhook Tools;
- native conversation turn-taking.

The frontend should not independently implement a parallel voice polling loop.

---

# 9. Canonical Live Interview Questions

These are the preferred questions for the controlled demo. The actual agent may phrase them naturally, but the underlying intent should remain the same.

## Question 1 — T001

> **"Why did you mark T001 as P1?"**

Purpose:

- reveal hidden judgment;
- connect P1 to whole-service impact;
- establish immediate escalation reasoning.

Expected expert explanation:

> The whole production website is down, so everyone is affected; that makes it P1 and it should be escalated immediately.

---

## Question 2 — T003

> **"You stopped normal troubleshooting on T003. Why?"**

Purpose:

- reveal the safety guardrail;
- discover the stop condition;
- capture what the expert would **never** ask the customer to do.

Expected expert explanation:

> Possible data loss means we stop and escalate. We don't ask the customer to modify or retry data.

This is the required guardrail-focused live question.

---

## Question 3 — T005

> **"What changed when you saw that many customers were affected?"**

Purpose:

- reveal systemic-impact reasoning;
- connect scope to priority/team/escalation.

Expected expert explanation:

> Multiple customers seeing the same API error indicates a systemic incident, so it should go to Engineering and be escalated immediately.

---

## Important

The interviewer should prefer **decision-triggering questions** over generic questions such as:

- "What are you doing?"
- "What is this page?"
- "What did you click?"

The point is to uncover **why**, **what changes the decision**, and **when to stop/escalate**.

---

# 10. Screen Events Expected From Capture

The screen-understanding layer should not attempt to produce a full narration of every pixel. It should emit meaningful events.

Representative events for the golden session are:

```text
00:08  T001 opened
00:18  T001 priority → P1
00:22  T001 team → Infrastructure
00:26  T001 action → Immediate escalation

00:33  T002 opened
00:41  T002 priority → P3
00:45  T002 team → Support
00:50  T002 action → Normal troubleshooting

00:50  T003 opened
01:00  T003 priority → P1
01:05  T003 team → Engineering
01:10  T003 action → STOP + escalate

01:07  T005 opened
01:15  T005 priority → P1
01:18  T005 team → Engineering
01:22  T005 action → Immediate escalation

01:24  T006 opened
01:30  T006 priority → P2
01:33  T006 team → Engineering
01:36  T006 action → Investigate performance
```

The exact timestamps may vary during implementation.

The important requirement is that each meaningful event has:

- a timestamp;
- a ticket ID;
- an event type;
- a concise description;
- optional evidence/screenshot reference.

The preferred event types are:

```text
ticket_opened
priority_changed
team_changed
action_changed
decision_saved
```

Avoid verbose events about cursor movement or pixel changes.

---

# 11. Debrief Phase

When the expert task ends, the Apprentice performs a spoken debrief using the **ElevenLabs conversational workflow**.

The debrief must ask at least **three follow-up questions that were not already answered during the live task**.

The preferred questions from the shared Teaching Script are:

## Debrief Question 1

> **"Would you treat a login problem the same way if only one employee is affected?"**

Purpose:

- test isolated-vs-systemic reasoning;
- establish the exception around single-user issues.

## Debrief Question 2

> **"What changes if many customers report the same API error?"**

Purpose:

- test systemic-impact reasoning;
- confirm the T005 rule.

## Debrief Question 3

> **"What is the rule for possible data loss?"**

Purpose:

- explicitly verify the most important safety guardrail.

## Debrief Question 4 — useful additional probe

> **"When do you stop normal troubleshooting?"**

Purpose:

- make the stop condition explicit;
- ensure the tutor later has a clean rule to apply.

The agent does not need to ask all four if three genuinely new questions have already closed the knowledge gaps.

---

# 12. ElevenLabs Debrief Flow

The debrief should be structured as a multi-stage conversational flow:

```text
Capture ends
    ↓
Stage 1 — Review key decisions
    ↓
Stage 2 — Identify knowledge gaps
    ↓
Stage 3 — Ask ≥3 follow-ups
    ↓
Stage 4 — Probe guardrails/exceptions
    ↓
Stage 5 — Teach-back
    ↓
Stage 6 — Expert confirmation/correction
    ↓
Structured debrief result
```

The exact ElevenLabs configuration may vary, but the semantic stages must remain.

Previous questions/answers should be supplied as context so the debrief does not waste time repeating questions the expert has already answered.

---

# 13. Teach-Back

After the debrief, the Apprentice should explain the learned workflow back to the expert.

A concise target teach-back is:

> "I first check the scope of the issue. If the whole production service is affected, I treat it as P1 and escalate immediately. A single-user issue is generally routine support. If customer data may have been lost, I stop normal troubleshooting and escalate rather than asking the customer to modify or retry data. If several customers have the same API issue, I treat it as systemic and escalate to Engineering. Several customers with performance issues indicate a broader performance problem that should be investigated."

The expert must be able to confirm or correct the explanation.

The confirmed teach-back is the point at which the learned knowledge becomes the **verified Work Map source**.

---

# 14. Canonical Work Map

The Work Map should represent the verified knowledge rather than simply summarizing the transcript.

The target Work Map from the shared spreadsheet is:

| Step | Screen Moment | Observed Action | Decision | Why (Expert's Words) | Guardrail | Teaching Point |
|---|---|---|---|---|---|---|
| 1 | 00:08 | Open T001 | Identify scope | "I first check whether one customer or everyone is affected." | If the whole service is down, do not treat it as routine support. | Always determine scope before priority. |
| 2 | 00:18 | T001 → P1 | Immediate escalation | "The whole production site is down, so it is P1." | Full outage → escalate immediately. | P1 is driven by impact, not just the wording of the complaint. |
| 3 | 00:33 | Open T002 | P3 support | "Only one person is affected, so I start normal troubleshooting." | Do not escalate a single-user issue without wider impact. | Check whether the issue is isolated. |
| 4 | 00:50 | Open T003 | P1 + STOP | "Missing customer data can become worse if we ask them to change or retry things." | Possible data loss → STOP normal processing and escalate. | Protect evidence/data before troubleshooting. |
| 5 | 01:07 | Open T005 | P1 engineering | "Many customers seeing API errors means it is probably systemic." | Multi-customer API failure → incident handling. | Use scope to distinguish local vs systemic issues. |
| 6 | 01:24 | Open T006 | P2 engineering | "Slow for several customers is a performance problem, not just one user's browser." | Multiple reports → investigate system-wide impact. | Repeated reports change the severity. |

## Work Map invariants

Every important Work Map step should preserve:

```text
screen moment
+
observed action
+
decision
+
expert reasoning
+
guardrail
+
teaching point
```

Where appropriate, the step should also link to the original screen evidence.

The Work Map must remain clickable in the UI so the viewer can move from a rule/decision back to the evidence that produced it.

---

# 15. Work Map Generation Architecture

The Work Map is generated after the expert's conversational session is complete.

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
        ↓
Work Map UI
```

ElevenLabs can provide structured conversational/debrief information, but the application maintains the canonical `WorkMap` schema.

### Requirements

The generated Work Map must:

- preserve timestamps;
- preserve ticket IDs;
- connect decisions to reasons;
- connect guardrails to evidence;
- preserve expert wording where possible;
- not invent rules unsupported by the session;
- distinguish confirmed knowledge from uncertain interpretation.

---

# 16. New-Hire Teaching Scenario

The Teach phase must use a case the expert did not demonstrate.

The canonical unseen scenario is:

> **"New case: 12 customers lost transaction history after an update."**

This case intentionally combines knowledge demonstrated separately in T003 and T005:

- multiple customers are affected;
- customer data may be missing;
- the issue may be systemic;
- the possible-data-loss guardrail applies.

### Intended teaching outcome

The trainee should understand that this is **not** a routine P3 support case.

The tutor should guide the trainee toward the learned reasoning rather than simply reading out the final answer immediately.

---

# 17. Canonical New-Hire Mistake

The key mistake is:

```text
New hire chooses:
P3 / Support / Normal troubleshooting
```

The tutor should intervene before Save.

A preferred first prompt is:

> **"What should you consider when customer data may be missing?"**

Then reinforce the expert's learned reasoning:

> **"Possible data loss is a stop-and-escalate case. What should you do next?"**

Desired correction:

```text
Possible data loss
        ↓
STOP normal processing
        ↓
Engineering
        ↓
P1
        ↓
Escalate
```

The exact UI can sequence the corrections however the product design requires.

---

# 18. Tutor Architecture

The tutor uses **ElevenAgents** and the verified Work Map.

Inputs:

```text
WorkMap
+
Current trainee ticket
+
Current workflow state
+
Recent ScreenEvents
+
DecisionAttempt
```

Behavior:

```text
New hire works
      ↓
Observe context
      ↓
Need guidance?
   /        \
 NO          YES
 │            │
continue   ElevenAgents
              │
       ask / coach / warn
              │
      decision attempt
              │
              ▼
       deterministic evaluator
              │
       ┌──────┴──────┐
     correct        wrong
        │              │
     continue      block Save
                       │
                  tutor explains
                       │
                replay evidence
                       │
                 trainee retries
```

The tutor should not invent new support policy.

It should ground explanations in the Work Map and the expert's own reasoning.

---

# 19. Tutor Behavior

The tutor is not supposed to behave like a generic chatbot.

### Before a mistake

Prefer prompting the trainee to reason:

> "What should you consider here?"

> "Is this an isolated issue or a broader impact?"

### When a wrong decision is attempted

The application should:

1. identify the incorrect decision;
2. prevent the unsafe/incorrect save where required;
3. create a `TutorIntervention`;
4. let ElevenAgents explain the issue verbally;
5. reference the relevant Work Map rule;
6. optionally replay the expert's original screen moment;
7. allow the trainee to correct the decision.

### Voice/UI consistency

The same intervention semantics should drive both:

```text
Frontend intervention
+
ElevenAgents voice response
```

They must not provide conflicting explanations.

---

# 20. Decision Evaluation Architecture

The evaluator exists primarily to answer:

> **Is the new hire's current decision compatible with what the expert taught?**

Use a hybrid strategy.

## Layer 1 — deterministic checks

For explicit workflow rules:

```text
possible data loss → required action = STOP + ESCALATE
whole-service outage → expected priority = P1
multi-customer systemic failure → Engineering / incident handling
```

These checks should be represented in the canonical workflow configuration/backend rather than hard-coded inside UI components.

## Layer 2 — Claude semantic assistance

Use Claude for:

- ambiguous interpretation;
- selecting relevant Work Map evidence;
- generating explanations;
- interpreting combinations of signals.

Claude should not silently invent a new rule.

---

# 21. Pre-Save Intervention

The save flow must be:

```text
New hire clicks Save
        ↓
Freeze current decision
        ↓
Decision evaluator
        ↓
allowSave?
   /          \
 YES           NO
 │              │
commit       block save
                 │
          TutorIntervention
                 │
          ElevenAgents voice
                 │
              retry
```

### Critical invariant

> **The voice agent is not the save authorization layer.**

Even if ElevenLabs is slow or unavailable, a deterministic critical guardrail should remain capable of blocking an unsafe decision.

---

# 22. Expert Evidence Replay

A Work Map step can link to a screen evidence reference.

```text
WorkMapStep
      ↓
screenshotRef / evidence ID
      ↓
Evidence Viewer
```

The evidence can be:

- stored screenshot;
- signed URL;
- local fixture;
- generated evidence identifier.

The workflow does not require a particular storage technology.

---

# 23. Privacy / Off-Record Workflow

The expert must have a visible:

```text
Pause Recording / Don't Record
```

control.

Expected behavior:

```text
Recording active
      ↓
Expert clicks Pause / Don't Record
      ↓
Screen capture / event processing pauses
      ↓
UI clearly shows paused state
      ↓
Resume when appropriate
```

While paused:

- no new screen events should be processed from the capture;
- no new captured content should be sent downstream;
- the voice layer should be informed of the paused state where practical.

Where personal data exists, Presidio can redact/mask information before persistence or downstream AI processing.

For this controlled demo, synthetic data is preferred.

---

# 24. Workflow State Machine

The application should expose deterministic states so all three implementation layers can integrate cleanly.

```text
IDLE
 │
 ▼
SESSION_STARTED
 │
 ▼
SCREEN_SHARING
 │
 ▼
EXPERT_WORKING
 │
 ├───────────────► CAPTURE_PAUSED
 │                       │
 │                       └────► EXPERT_WORKING
 │
 ▼
TASK_COMPLETED
 │
 ▼
DEBRIEF
 │
 ▼
TEACH_BACK
 │
 ├── correction ──► DEBRIEF
 │
 ▼
WORK_MAP_READY
 │
 ▼
TRAINING_READY
 │
 ▼
NEW_HIRE_WORKING
 │
 ▼
DECISION_ATTEMPT
 │
 ├── correct ─────► CONTINUE
 │
 └── wrong ───────► TUTOR_INTERVENTION
                         │
                         ▼
                     CORRECTION
                         │
                         ▼
                      CONTINUE
                         │
                         ▼
                  TRAINING_COMPLETE
```

The ElevenLabs conversational flow operates alongside this application state machine. It must not silently redefine workflow state.

---

# 25. Integration Objects

These objects define the workflow-level data exchanged between the three technical layers.

## ScreenEvent

```ts
interface ScreenEvent {
  id: string;
  timestamp: number;
  ticketId: string;
  type:
    | "ticket_opened"
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

## ExpertAnswer

```ts
interface ExpertAnswer {
  id: string;
  timestamp: number;
  question: string;
  answer: string;
  relatedEventId?: string;
  phase: "capture" | "debrief";
}
```

## WorkMapStep

```ts
interface WorkMapStep {
  id: string;
  stepNumber: number;
  screenMoment: number;
  ticketId?: string;
  observedAction: string;
  decision: string;
  expertReason: string;
  guardrails: string[];
  teachingPoint: string;
  screenshotRef?: string;
  expertQuote?: string;
}
```

## TutorIntervention

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
  reason: string;
  guardrail?: string;
  expertEvidence?: {
    workMapStepId: string;
    screenMoment: number;
    screenshotRef?: string;
  };
}
```

These definitions must remain aligned with `shared/types.ts` and `INTEGRATION.md`.

---

# 26. Event-to-Conversation Context

The screen event should be translated into concise semantic context before being provided to ElevenAgents.

Example:

```text
ScreenEvent:
T003 opened
Priority: P1
Team: Engineering
Action: STOP + escalate

Suggested reasoning target:
Why did the expert stop normal troubleshooting?
```

The voice agent should not receive an uncontrolled stream of raw screenshots.

Use:

```text
ScreenEvent
      ↓
context bridge
      ↓
Dynamic Variables / Client Tool
      ↓
ElevenAgents
```

The agent decides whether a question is appropriate; an incoming event alone must not force it to speak.

---

# 27. Agent Tooling Boundaries

## Client-side tool examples

ElevenAgents may trigger:

```text
show_intervention()
open_workmap_step(step_id)
replay_expert_evidence(step_id)
highlight_ticket(ticket_id)
```

These affect the visible product UI.

## Server-side tool examples

The agent may request:

```text
get_relevant_workmap_rule(step_id)
get_current_ticket_context(ticket_id)
```

The backend/application remains responsible for persistence and critical business logic.

## MCP

MCP is optional.

A future tutor tool could be:

```text
get_guardrail(step_id)
```

but MCP must not be required for the golden demo.

---

# 28. Training Result

After the trainee corrects the case, show a concise result.

Recommended categories:

```text
Knowledge demonstrated

✓ Scope assessment
✓ Priority reasoning
✓ Systemic-impact reasoning
✓ Data-loss guardrail

Needs more practice

[Only include items actually missed during the session]
```

Results can combine:

```text
deterministic evaluation
+
Work Map coverage
+
ElevenLabs conversation analysis
```

Do not display a success claim unsupported by the actual training interaction.

---

# 29. Conversation Analysis / Data Collection

ElevenLabs conversation analysis/data collection may provide structured post-session signals such as:

```text
live_question_count
guardrail_question_asked
debrief_question_count
teach_back_completed
expert_confirmation
tutor_intervention_count
```

These can be incorporated into the training/session result.

However, the core workflow correctness must remain available independently of provider-level conversation analytics.

---

# 30. Workflow Reliability Rules

The workflow is intended for a live hackathon demo.

### Deterministic

Keep these deterministic:

- T001–T006 data;
- field options;
- canonical intended outcomes;
- unseen training case;
- critical data-loss guardrail;
- Save/Block behavior;
- fixture fallback.

### AI-driven

Use AI for:

- screen understanding;
- semantic event extraction;
- expert reasoning extraction;
- live conversational questioning;
- debrief;
- teach-back;
- Work Map synthesis;
- tutor explanation.

The product should feel intelligent without making the golden path unpredictable.

---

# 31. Workflow Must NOT Become

Do not turn this into:

- a generic customer-support chatbot;
- an autonomous ticket-resolution agent;
- a simple screen recorder;
- a static SOP generator;
- a hard-coded decision tree with no expert conversation;
- a demo where the tutor simply reads the correct answer;
- a workflow where the trainee repeats the exact expert ticket;
- a large multi-workflow enterprise platform.

The defining behavior is:

```text
Observe
  ↓
Ask why
  ↓
Learn reasoning
  ↓
Verify understanding
  ↓
Map knowledge
  ↓
Teach on a new case
  ↓
Catch a mistake
```

---

# 32. Ownership by Person

## Person 1 — Frontend / workflow UI

Owns:

- Support Triage application;
- ticket list and ticket detail UI;
- Expert Capture UI;
- screen-sharing controls;
- ElevenLabs Widget/SDK placement;
- Work Map UI;
- evidence replay UI;
- new-hire workspace;
- intervention UI;
- training result UI.

## Person 2 — ElevenLabs / conversational layer

Owns:

- ElevenAgents interviewer;
- live question behavior;
- Dynamic Variables;
- Client/Webhook Tools;
- expert transcript/answers;
- debrief;
- teach-back;
- tutor agent;
- interactive voice simulation/testing;
- Conversation Analysis/Data Collection;
- ElevenLabs-specific provider integration.

## Person 3 — Vision / reasoning / backend

Owns:

- Claude Vision;
- ScreenEvent extraction;
- Work Map generation;
- guardrail extraction;
- decision evaluation;
- deterministic workflow rules;
- persistence/orchestration;
- privacy/Presidio integration.

### Shared

All three coordinate through:

- `CONTEXT.md`;
- `ARCHITECTURE.md`;
- `WORKFLOW.md`;
- `INTEGRATION.md`;
- shared TypeScript/JSON contracts.

---

# 33. Definition of a Correct Workflow Implementation

The workflow is complete only when all of the following are demonstrably true:

```text
[ ] Expert can process the canonical support tickets in the Support Triage UI.
[ ] Screen sharing starts and stops cleanly.
[ ] Meaningful screen events can be represented.
[ ] ElevenLabs interviewer is embedded and usable.
[ ] Apprentice asks at least 3 contextual live questions.
[ ] At least 1 live question reveals/probes a guardrail.
[ ] Debrief asks at least 3 genuinely new questions.
[ ] Teach-back can be confirmed/corrected by the expert.
[ ] Work Map contains actions, decisions, reasons and guardrails.
[ ] Work Map steps link to evidence.
[ ] New hire receives the unseen 12-customer data-loss case.
[ ] New hire can attempt the wrong decision.
[ ] The wrong decision is caught before Save.
[ ] Tutor explains the correction using expert-derived reasoning.
[ ] New hire can correct the decision.
[ ] Training result is shown.
[ ] Conversation analysis/result data can be incorporated where available.
[ ] Pause / Don't Record behavior works.
[ ] Missing AI/provider data has a graceful fallback.
```

---

# 34. Source of Truth

For workflow semantics, use this order of authority:

1. **Shared Support Triage workflow spreadsheet** — exact ticket data, Work Map rows and teaching-script wording.
2. **Challenge brief** — product requirements and judging requirements.
3. **Demo video / reference screenshots** — intended interaction pattern and visual structure.
4. **This `WORKFLOW.md`** — normalized repository specification.
5. **Implementation files** — only after the above have been respected.

If a future implementation decision conflicts with this document, stop and resolve the conflict with the team before silently changing the canonical workflow.

---

# 35. Final Workflow Picture

```text
                         EXPERT
                           │
                           ▼
                    SUPPORT TRIAGE
                           │
                  ┌────────┴────────┐
                  │                 │
             Screen State         Voice
                  │                 │
                  ▼                 ▼
             Claude Vision     ElevenAgents
                  │                 │
                  ▼                 │
            ScreenEvents ───────────┘
                  │
                  ▼
             Expert Answers
                  │
                  ▼
        ElevenLabs Debrief Flow
                  │
                  ▼
             Teach-back
                  │
                  ▼
           Expert confirms
                  │
                  ▼
              WORK MAP
                  │
                  ▼
              NEW HIRE
                  │
                  ▼
          Unseen Support Case
                  │
                  ▼
        Decision / Screen State
                  │
                  ▼
        Deterministic Evaluator
                  │
            ┌─────┴─────┐
          correct       wrong
             │             │
           Save        Block Save
                           │
                           ▼
                    ElevenAgents Tutor
                           │
                    Explain + replay
                           │
                           ▼
                       Correct
                           │
                           ▼
                    Training Result
```

The workflow's central idea remains:

> **The Apprentice does not learn how to click through support tickets. It learns how an expert thinks about scope, impact, escalation, exceptions and safety — then transfers that knowledge to a new employee.**
