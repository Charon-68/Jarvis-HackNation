# AI Apprentice — WORKTODO: Person 2

**Role:** ElevenLabs / Voice / Conversation

**Owns:** All ElevenLabs-specific conversational behavior: interviewer, live questions, debrief, teach-back, tutor, Dynamic Variables, Client/Webhook Tools, voice simulation/testing, conversation analysis, and the provider adapter.

**Does not own:** React/UI component implementation, Claude Vision, Work Map generation, deterministic Save/Block rules, database schema.

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

Use the canonical Support Triage workflow and teaching script. Do not invent a second workflow.

---

# 1. ElevenLabs Implementation Boundary

Everything provider-specific must live behind a provider adapter.

Recommended structure:

```text
agents/
├── interviewer/
├── debrief/
├── tutor/
├── tools/
├── workflows/
├── analysis/
└── elevenlabs-adapter/
```

Frontend should interact only through:

```ts
VoiceAgentAdapter
```

---

# 2. Task P2-01 — ElevenLabs Project / Agent Setup

Create/configure the ElevenAgents setup required for three semantic modes:

```text
INTERVIEWER
DEBRIEF / TEACH-BACK
TUTOR
```

These can be separate agents or mode-specific configurations if that is more reliable.

Do not create more agents than necessary for the demo.

**Done when:** a test conversation can be started programmatically and a generic status event reaches the adapter.

---

# 3. Task P2-02 — Web SDK / Widget Integration

Implement the provider-specific web voice connection.

Responsibilities:

- connect;
- disconnect;
- agent status;
- receive/send relevant messages;
- expose provider-neutral events;
- handle connection failure/retry.

Do not leak ElevenLabs message objects into `AgentMessage` consumers.

**Done when:** Person 1 can mount a voice side panel using only `VoiceAgentAdapter`.

---

# 4. Task P2-03 — VoiceAgentAdapter

Implement:

```ts
interface VoiceAgentAdapter {
  connect(input: {
    sessionId: string;
    mode: "interviewer" | "tutor";
  }): Promise<void>;

  disconnect(): Promise<void>;

  updateContext(context: Record<string, unknown>): Promise<void>;

  sendScreenEvent(event: ScreenEvent): Promise<void>;

  sendWorkMap(workMap: WorkMap): Promise<void>;

  sendIntervention(intervention: TutorIntervention): Promise<void>;

  onMessage(callback: (message: AgentMessage) => void): () => void;

  onStatusChange(callback: (status: string) => void): () => void;
}
```

The exact SDK implementation stays entirely inside this layer.

---

# 5. Task P2-04 — Dynamic Variables Context

Expose compact semantic context to ElevenAgents.

At minimum support the equivalent of:

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
recent_decision_count
```

Do not continuously inject raw screenshots.

Do not pass secrets.

Do not use Dynamic Variables as persistent storage.

**Done when:** when T003 changes to P1 / Engineering / STOP + escalate, the agent has the relevant semantic context.

---

# 6. Task P2-05 — Client Tools

Implement only tools that require visible app behavior.

Recommended tools:

```text
show_intervention(intervention)
open_workmap_step(step_id)
replay_expert_evidence(step_id)
highlight_ticket(ticket_id)
show_notification(message)
```

These should invoke provider-neutral frontend handlers.

The actual tool registration is ElevenLabs-specific.

**Done when:** the agent can cause a visible UI action without directly mutating application state.

---

# 7. Task P2-06 — Webhook / Server Tools

Use server-side tools only when backend state/computation is required.

Possible tools:

```text
get_current_ticket_context
get_relevant_workmap_rule
evaluate_training_decision
persist_agent_event
```

Do not bypass canonical application contracts.

Do not allow voice tools to become the system of record for business state.

---

# 8. Task P2-07 — Interviewer Prompt / Behavior

The interviewer must behave like an apprentice observing an expert, not like a generic chatbot.

Prioritize questions that reveal:

1. reasoning;
2. thresholds;
3. scope / impact interpretation;
4. exceptions;
5. stop conditions;
6. what the expert would never do.

Avoid generic questions such as:

> What are you doing?

when the screen already makes the action obvious.

The agent should primarily ask about decision points such as:

```text
T001 → P1
T003 → STOP + escalate
T005 → P1 / Engineering
```

---

# 9. Task P2-08 — Natural-Pause Question Timing

The agent must not interrupt constantly.

Native ElevenAgents turn-taking/conversation behavior should be preferred.

The agent should consider:

- expert actively typing/reading/speaking;
- meaningfulness of the event;
- whether a question was recently asked;
- whether the event itself already answers the question;
- whether the main safety guardrail has been explored.

Required live questioning outcome:

```text
≥ 3 meaningful questions during expert task
```

At least one must expose a guardrail / safety rule.

---

# 10. Task P2-09 — Live Question Set

Canonical question intents:

### T001

Ask why the ticket was treated as P1 / immediate escalation.

### T003

Ask why normal troubleshooting was stopped.

### T005

Ask what changes when many customers experience the same API error.

The agent may phrase these naturally, but the semantic intent must remain.

**Done when:** these answers can be represented as `ExpertAnswer` records tied to `ScreenEvent` IDs.

---

# 11. Task P2-10 — Expert Answer Extraction / Normalization

Convert spoken answers into provider-neutral:

```ts
ExpertAnswer
```

Rules:

- preserve raw answer text;
- preserve original question;
- store `phase` correctly;
- attach `relatedEventId` where possible;
- do not summarize before persistence;
- do not silently rewrite the expert's words.

**Done when:** one voice answer becomes one valid `ExpertAnswer` without Person 1 knowing the ElevenLabs format.

---

# 12. Task P2-11 — Question → Event Association

Associate live questions with the semantic event that triggered them.

Example:

```text
ScreenEvent evt_017
      ↓
Question
      ↓
Answer ans_03
      ↓
relatedEventId = evt_017
```

Use event IDs from the shared contract, not frontend component IDs.

---

# 13. Task P2-12 — End Expert Task Transition

When Person 1 ends capture:

```text
capture active
    ↓
freeze live questioning
    ↓
dephash / debrief mode
```

The ElevenLabs conversational layer must receive the frozen session context needed for debrief.

Do not let late voice events mutate the already-frozen capture state.

---

# 14. Task P2-13 — Debrief Flow

Build the multi-stage debrief using ElevenLabs native workflow/procedure/flow features where practical.

Semantic stages:

```text
Review observed decisions
→ ask unresolved knowledge questions
→ probe guardrails / exceptions
→ teach-back
→ expert confirmation/correction
→ emit structured result
```

The exact implementation can differ; the behavior cannot.

---

# 15. Task P2-14 — Debrief Questions

At least three follow-ups must be genuinely new relative to live capture.

Preferred questions:

1. “Would you treat a login problem the same way if only one employee is affected?”
2. “What changes if many customers report the same API error?”
3. “What is the rule for possible data loss?”
4. “When do you stop normal troubleshooting?”

Only the first three are required if they close the relevant gaps; use the fourth when useful.

The flow should know which concepts were already answered and avoid simply repeating them.

---

# 16. Task P2-15 — Debrief Gap Detection

Before asking a debrief question, consider:

```text
already answered?
unresolved?
low confidence?
guardrail missing?
exception missing?
```

Use session context, existing `ExpertAnswer[]`, and event coverage.

Do not build a separate full knowledge engine; lightweight orchestration is sufficient.

---

# 17. Task P2-16 — Teach-Back

The agent must explain its learned understanding back to the expert.

The target semantic understanding includes:

- assess scope first;
- whole production outage → P1 / immediate escalation;
- single-user login issue → generally routine support;
- possible data loss → stop normal processing + escalate;
- multi-customer API failure → systemic / Engineering escalation;
- several customers with performance issues → investigate broader performance issue.

The expert must explicitly confirm or correct the teach-back.

**Important:** the final confirmed state is the source for Work Map generation.

---

# 18. Task P2-17 — Teach-Back Structured Result

Emit provider-neutral information equivalent to:

```text
teach_back_completed
expert_confirmation
correction_text (when applicable)
```

Do not set `confirmedByExpert=true` just because the agent finished speaking.

Only actual expert confirmation counts.

---

# 19. Task P2-18 — Tutor Agent

Configure the ElevenAgents tutor to consume the verified Work Map.

Tutor goals:

- guide rather than immediately reveal answers;
- ask a prediction/reasoning question;
- identify a wrong direction;
- explain using expert-learned rules;
- point to evidence when appropriate;
- encourage correction.

For the canonical unseen case, the trainee should initially be able to choose P3.

---

# 20. Task P2-19 — Voice Intervention

When Person 3 returns:

```ts
TutorIntervention
```

speak the same semantic reason rendered in the UI.

Example:

> “Before you submit that, remember the expert’s stop-and-escalate rule for possible data loss.”

Do not create a separate voice-only reason.

---

# 21. Task P2-20 — Work Map Context to Tutor

Support:

```ts
sendWorkMap(workMap)
```

The tutor should receive:

- learned principles;
- guardrails;
- examples;
- relevant evidence IDs;
- current unseen case.

Do not make the tutor reconstruct the workflow from raw transcript if the Work Map is available.

---

# 22. Task P2-21 — Interactive Voice Training / Testing

Use ElevenLabs interactive voice simulation/testing where useful to make the trainee interaction feel like real coaching.

Required behavior:

```text
trainee acts
→ tutor asks / responds
→ trainee explains
→ evaluator/intervention occurs
→ tutor reinforces rule
```

This is a coaching surface, not the Save/Block authority.

---

# 23. Task P2-22 — Conversation Analysis / Data Collection

Configure useful post-session fields such as:

```text
live_question_count
guardrail_question_asked
debrief_question_count
teach_back_completed
expert_confirmation
tutor_intervention_count
training_success
```

The app may combine these with deterministic results.

Do not create a duplicate conversation-analysis engine in our backend.

---

# 24. Task P2-23 — Agent Status

Expose provider-neutral states such as:

```text
idle
connecting
listening
thinking
speaking
paused
error
```

Map ElevenLabs-specific status into these values.

Person 1 should not receive provider-internal states.

---

# 25. Task P2-24 — MockVoiceAgent

Build a fake adapter using deterministic scripted messages.

It must support:

- interviewer questions;
- expert answer messages;
- debrief messages;
- teach-back;
- tutor intervention;
- agent status.

This allows Person 1 and Person 3 to integrate without the live ElevenLabs service.

---

# 26. Task P2-25 — ElevenLabs Failure Handling

Handle:

- connection failure;
- timeout;
- tool failure;
- agent unavailable;
- malformed provider message;
- user disconnect.

Return provider-neutral errors / status.

The application must preserve the workflow session when voice fails.

---

# 27. Exact Deliverables to Person 1

Provide:

```text
VoiceAgentAdapter
AgentMessage events
agent status events
ExpertAnswer output
client-tool handlers/events
TutorIntervention voice hook
```

Person 1 should be able to integrate without importing ElevenLabs internals.

---

# 28. Exact Deliverables to Person 3

Provide / consume:

```text
ExpertAnswer[]
Teach-back confirmation/correction
structured analysis fields
current session / ticket context
```

Person 2 should not depend on Person 3's database implementation.

---

# 29. Files Person 2 Should Own

Primarily:

```text
agents/
elevenlabs/
voice adapter/
agent tools/
workflows/
analysis/
prompt/flow configuration/
```

Avoid editing:

```text
frontend components
backend storage schema
vision implementation
workmap generation
```

Shared files are read-only by default.

---

# 30. Person 2 Final Acceptance Test

A tester should be able to:

```text
Start expert session
→ ElevenLabs connects
→ agent listens while expert works
→ meaningful question after T001
→ expert answers
→ meaningful question around T003
→ expert answers guardrail
→ meaningful question around T005
→ expert answers systemic-impact rule
→ capture ends
→ debrief asks ≥3 new follow-ups
→ teach-back occurs
→ expert confirms/corrects
→ tutor mode starts
→ tutor receives Work Map
→ trainee makes wrong decision
→ tutor explains intervention
→ trainee responds/corrects
```

All provider specifics must remain behind the adapter boundary.
