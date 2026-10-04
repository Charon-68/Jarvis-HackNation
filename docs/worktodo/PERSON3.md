# AI Apprentice — WORKTODO: Person 3

**Role:** Vision / Reasoning / Backend

**Owns:** Claude Vision, semantic screen-event extraction, event normalization, Work Map synthesis, guardrail extraction, deterministic evaluation, semantic evaluation support, persistence/API, evidence storage references, privacy/redaction.

**Does not own:** React UI, screen-share browser controls, ElevenLabs agent prompts/voice logic.

---

## 0. Read Before Coding

Read:

```text
README.md
CONTEXT.md
ARCHITECTURE.md
WORKFLOW.md
INTEGRATION.md
shared/types.ts
shared/demo-tickets.*
```

The canonical rule is: **workflow state is application truth; Work Map is learned knowledge.** Do not blur the two.

---

# 1. Backend / Service Structure

Recommended structure:

```text
backend/
├── api/
├── sessions/
├── events/
├── workmap/
├── evaluation/
├── privacy/
├── storage/
└── mocks/

vision/
├── claude-adapter/
├── sampler/
├── normalization/
└── prompts/
```

Exact framework layout can differ.

---

# 2. Task P3-01 — Claude Provider Adapter

Create one internal Anthropic/Claude adapter.

Responsibilities:

- model/API configuration;
- multimodal request building;
- structured JSON response handling;
- retries/timeouts;
- provider-specific error normalization.

No Claude SDK calls should appear in Person 1 frontend components or shared contract consumers.

---

# 3. Task P3-02 — Screen Frame → Semantic ScreenEvent

Implement:

```text
sampled frame
    ↓
Claude Vision
    ↓
structured observation
    ↓
ScreenEvent
```

The event must describe workflow-relevant change, e.g.:

```text
T003 opened
Priority changed → P1
Team changed → Engineering
Action changed → STOP + escalate
```

Do not generate events for:

- cursor movement;
- every frame;
- irrelevant visual changes;
- generic OCR text with no workflow meaning.

---

# 4. Task P3-03 — Event Normalization

Normalize model output into canonical:

```ts
ScreenEvent
```

Required fields:

```text
id
sessionId
timestampMs
ticketId
type
description
```

Optional where available:

```text
previousValue
newValue
screenshotRef
source
confidence
```

Reject malformed events rather than storing incompatible data.

---

# 5. Task P3-04 — Hybrid Event Reliability

Support two signals:

```text
Frontend workflow state ─────┐
                             ├──► event normalization
Claude Vision screenshot ────┘
```

For the controlled demo, deterministic UI state can support or validate vision output.

Record the source as:

```text
vision
workflow_state
hybrid
```

Do not force the whole demo to depend on perfect vision recognition.

---

# 6. Task P3-05 — ScreenEvent Persistence API

Implement logical endpoint:

```http
POST /api/screen-events
```

Accept one or more events.

Requirements:

- idempotent by event ID;
- validate schema;
- preserve timestamps;
- associate with session;
- preserve evidence reference;
- reject invalid session/event data.

---

# 7. Task P3-06 — Session API

Implement at least:

```http
POST /api/sessions
POST /api/sessions/:sessionId/end
```

Session phases must support:

```text
ready
capturing
debrief
map_ready
training
completed
error
```

The backend is the persistence source for session records.

---

# 8. Task P3-07 — ExpertAnswer Persistence

Implement:

```http
POST /api/expert-answers
```

Store the canonical `ExpertAnswer` without rewriting the raw answer.

Support:

- capture answers;
- debrief answers;
- event associations;
- idempotent IDs.

---

# 9. Task P3-08 — Work Map Generation Input Assembly

Assemble:

```text
Session
+ ScreenEvents
+ ExpertAnswers
+ debrief answers
+ teach-back confirmation
        ↓
Claude
```

Canonical input shape:

```ts
interface WorkMapGenerationInput {
  session: Session;
  screenEvents: ScreenEvent[];
  expertAnswers: ExpertAnswer[];
  workflowName: "Support Ticket Triage";
}
```

Do not generate a map only from raw transcript when structured evidence is available.

---

# 10. Task P3-09 — Claude Work Map Synthesis

Generate:

```ts
WorkMap
```

Every important step should preserve:

- timestamp;
- ticket ID;
- observed action;
- decision;
- expert reason;
- guardrails;
- exceptions;
- teaching point;
- evidence reference;
- source event IDs.

The Work Map should represent verified expert knowledge, not generic AI advice.

---

# 11. Task P3-10 — Guardrail Extraction

Explicitly extract / retain critical rules such as:

```text
Possible data loss → STOP normal processing + escalate.
Full production outage → immediate escalation.
Multiple customers with same API failure → systemic / Engineering.
Several customers with performance problem → investigate broader impact.
Single-user issue → generally routine support unless wider impact appears.
```

These rules must be supported by evidence from the captured session / teach-back.

---

# 12. Task P3-11 — Work Map Validation

Before persistence, validate:

- valid JSON;
- required IDs;
- ordered unique steps;
- non-negative timestamps;
- arrays for guardrails/exceptions;
- workflow name matches canonical workflow;
- evidence references are valid when present;
- no unsupported rule is presented as confirmed;
- `confirmedByExpert` is true only after actual expert confirmation.

Malformed model output must be rejected or repaired before canonical storage.

---

# 13. Task P3-12 — Work Map API

Implement:

```http
POST /api/work-maps/generate
GET  /api/work-maps/:workMapId
```

The generation endpoint may regenerate from stored session evidence.

Keep old evidence/answers even when generation fails.

---

# 14. Task P3-13 — Evidence Storage / References

Store or reference evidence artifacts using stable identifiers.

Examples:

```text
frame_050
frame_107
```

The actual storage can be:

- local file;
- object storage;
- deterministic demo fixture;
- signed URL.

The frontend receives only `screenshotRef`.

---

# 15. Task P3-14 — Canonical Training Scenario

Represent the unseen case in backend fixtures:

> 12 customers lost transaction history after an update.

Expected classification:

```text
P1
Engineering
STOP + escalate
```

Expected wrong trainee attempt:

```text
P3
Support
Normal troubleshooting
```

The evaluator must detect this before save.

---

# 16. Task P3-15 — Deterministic Rule Engine

Implement critical workflow rules outside the LLM.

At minimum:

```ts
if (ticket.hasPotentialDataLoss && action !== "STOP + escalate") {
  return criticalIntervention;
}
```

For the controlled demo also encode the canonical systemic/full-outage rules from workflow configuration.

**Important:** these rules belong in workflow configuration/backend logic, not frontend components and not the voice agent.

---

# 17. Task P3-16 — Decision Evaluation API

Implement:

```http
POST /api/training/decision-attempt
```

Input:

```ts
DecisionAttempt
```

Output:

```ts
{
  allowSave: boolean;
  intervention: TutorIntervention | null;
}
```

For the critical guardrail:

```text
incorrect
→ allowSave=false
→ severity=critical
→ guardrail included
→ evidence reference included where possible
```

---

# 18. Task P3-17 — Semantic Evaluation with Claude

Use Claude only where deterministic rules are insufficient.

Possible responsibilities:

- interpret ambiguous scope statements;
- explain why a decision conflicts with learned reasoning;
- choose relevant Work Map evidence;
- produce natural-language reason.

Do not let Claude override a deterministic critical safety block.

---

# 19. Task P3-18 — TutorIntervention Generation

Produce a semantic object that both voice and UI can consume:

```ts
TutorIntervention
```

For the canonical case it should contain:

```text
correct=false
severity=critical
message=clear intervention
reason=expert-grounded reason
guardrail=possible-data-loss stop condition
expertEvidence=Work Map step for T003
```

Do not generate one reason for UI and another for voice.

---

# 20. Task P3-19 — Save/Block Authority

The evaluator is the authorization boundary.

Required sequence:

```text
Frontend Save
    ↓
DecisionAttempt
    ↓
backend evaluator
    ↓
allowSave
```

The unsafe decision must never be persisted before the evaluator result.

Voice latency must have no effect on this decision.

---

# 21. Task P3-20 — Training Result Backend

Record enough information to compute:

```text
initial decision
intervention occurred?
initial decision was wrong?
correction occurred?
final decision
training completed?
```

Final app result should combine deterministic evaluation with optional ElevenLabs conversation-analysis fields.

---

# 22. Task P3-21 — Privacy / Presidio

Where practical:

```text
frame / transcript
      ↓
redaction
      ↓
storage / downstream AI
```

For MVP, demonstrate the capability without allowing privacy work to block the golden demo.

Support at least the conceptual `paused/off-record` boundary from Person 1.

---

# 23. Task P3-22 — Session / Evidence Storage

Persist:

```text
Session
ScreenEvent[]
ExpertAnswer[]
WorkMap
DecisionAttempt[]
TutorIntervention
training result
```

A lightweight database/store is sufficient.

Do not couple the persistence model to React state or ElevenLabs internal state.

---

# 24. Task P3-23 — Mock Services

Maintain mocks for:

```text
MockScreenEventProvider
MockWorkMapProvider
MockDecisionEvaluator
```

Mock outputs must satisfy the exact shared interfaces.

Person 1 must be able to run the frontend without this service being live.

Person 2 must be able to receive deterministic ScreenEvents.

---

# 25. Task P3-24 — Integration Error Contract

Return structured errors:

```ts
interface IntegrationError {
  code: string;
  message: string;
  retryable: boolean;
  requestId?: string;
}
```

Useful codes:

```text
SESSION_NOT_FOUND
INVALID_SCREEN_EVENT
WORKMAP_GENERATION_FAILED
WORKMAP_INVALID
EVALUATION_UNAVAILABLE
PRIVACY_REDACTION_FAILED
```

---

# 26. Task P3-25 — Idempotency / Ordering

Make these safe to retry:

- ScreenEvent append;
- ExpertAnswer append;
- Work Map save;
- DecisionAttempt evaluation.

Use stable IDs.

Sort semantic events by `timestampMs`, not network arrival order.

---

# 27. Task P3-26 — Golden Fixtures

Maintain:

```text
fixtures/
├── expert-session.json
├── screen-events.json
├── expert-answers.json
├── work-map.json
├── trainee-case.json
└── tutor-intervention.json
```

The fixtures must correspond to the canonical Support Triage workflow.

---

# 28. Task P3-27 — Vision / Work Map Tests

Test:

- valid screenshot event extraction;
- malformed Claude output;
- event normalization;
- evidence association;
- Work Map schema validation;
- missing answer handling;
- unsupported-rule rejection;
- teach-back confirmation gating.

---

# 29. Task P3-28 — Evaluator Tests

At minimum:

```text
T001 full outage → P1 / escalation accepted
T002 single user → P3 / routine accepted
T003 data loss + normal troubleshooting → BLOCK
T003 data loss + STOP + escalate → ALLOW
T005 many customers API errors → systemic escalation accepted
T006 several customers slow → P2 / Engineering accepted
Unseen data-loss case + P3 → BLOCK
Unseen data-loss case corrected → ALLOW
```

The unsafe save path must be tested independently of ElevenLabs.

---

# 30. Exact Backend API Surface

Implement at minimum:

```http
POST /api/sessions
POST /api/screen-events
POST /api/expert-answers
POST /api/sessions/:sessionId/end
POST /api/work-maps/generate
GET  /api/work-maps/:workMapId
POST /api/training/decision-attempt
```

Exact route names can differ only if the team agrees; the logical operations must remain.

---

# 31. Files Person 3 Should Own

Primarily:

```text
backend/
vision/
workmap/
evaluation/
privacy/
storage/
fixtures/
```

Avoid editing:

```text
frontend components
agents prompts
ElevenLabs provider implementation
```

Shared files are read-only by default, except contract changes agreed with the team.

---

# 32. Person 3 Final Acceptance Test

A tester should be able to:

```text
Create expert session
→ receive frames
→ produce ScreenEvents
→ persist them
→ receive ExpertAnswers
→ generate valid WorkMap
→ confirm teach-back
→ persist WorkMap
→ start training
→ submit P3/Support/Normal troubleshooting on unseen data-loss case
→ evaluator returns allowSave=false
→ intervention references data-loss guardrail
→ trainee corrects decision
→ evaluator allows save
→ final result records success
```

The critical Save/Block behavior must work even if ElevenLabs is disconnected.
