# AI Apprentice — Integration Contracts & Agent Spec

This document defines the interface contracts connecting:

1. Lovable / React Frontend (Spreadsheet Ticket Review UI + Side Panel Voice Interface)
2. ElevenLabs Platform (Real-Time AI Apprentice + Intern Triage Coach Agents)
3. Claude / FastAPI Backend (Tacit Heuristic Extraction & Training Guide Synthesis)

---

## 1. ElevenLabs Agent IDs & Endpoints

| Resource            | Value / ID                             | Notes                                                      |
| ------------------- | -------------------------------------- | ---------------------------------------------------------- |
| AI Apprentice Agent | `agent_9501m425131dfx5tmyks9aq9a003` | Observes expert ranking/discarding complaints in Excel     |
| Intern Coach Agent  | `agent_9001m425vwj8f1c8w9d6wdypjpay` | Quizzes intern on complaint triage and evaluates reasoning |
| React Package       | `@elevenlabs/react`                  | Wraps WebRTC / WebSocket audio in the side panel           |

---

## 2. Frontend Client Tool Handlers (`@elevenlabs/react`)

Person 1 registers these 3 client tools in the `useConversation` hook:

### A. `get_ticket_context`

- **Agent Call:** Invoked when the Apprentice inspects the active spreadsheet row.
- **Input Schema:** `{ ticket_id: string }`
- **Output Format:**

```json
{
  "ticket_id": "TK-1042",
  "row_number": 14,
  "customer_tier": "Enterprise",
  "complaint_summary": "Sync delay under 10 minutes during scheduled maintenance",
  "account_status": "Active Paid"
}
```

### B. `log_expert_decision`

- **Agent Call:** Invoked after the expert explains why a complaint was ranked or discarded.
- **Input Schema:**

```json
{
  "ticket_id": "TK-1042",
  "action_taken": "Discarded",
  "decision_rationale": "Sync delays during announced maintenance windows are expected and do not warrant escalation unless billing is impacted."
}
```

- **Output Format:** `{"status": "logged"}`

### C. `trigger_debrief_summary`

- **Agent Call:** Invoked during the exit debrief when the spreadsheet review is complete.
- **Input Schema:** `{ session_id: string, tickets_processed: number }`
- **Action:** Sends collected heuristics to Backend `POST /api/synthesize-sop`.

---

## 3. Screen Awareness (`sendContextualUpdate`)

Whenever the expert clicks a row or marks a decision in the spreadsheet:

```ts
// Silent injection — updates LLM context without speaking
conversation.sendContextualUpdate(
  `[SPREADSHEET UPDATE]: Expert selected Row 14 (Ticket #TK-1042). Action taken: Discarded.`,
  "screen_state"
);
```

---

## 4. Backend Synthesis Contract (`POST /api/synthesize-sop`)

Person 3's FastAPI endpoint specification:

### Request Body

```json
{
  "session_id": "sess_1728001234",
  "tickets": [
    {
      "ticket_id": "TK-1042",
      "action_taken": "Discarded",
      "decision_rationale": "Sync delays during scheduled maintenance are expected; discard unless billing affected."
    }
  ]
}
```

### Response Body

```json
{
  "status": "success",
  "session_id": "sess_1728001234",
  "sop_markdown": "# SOP: Customer Complaint Triage & Discard Rules\n...",
  "training_scenarios": [
    {
      "complaint_id": "TK-1042",
      "scenario": "Customer complains about 8-minute sync delay during maintenance.",
      "correct_action": "Discard",
      "expert_rule": "Ignore maintenance sync delays under 15 minutes."
    }
  ],
  "rubric": {
    "triage_accuracy": "Must correctly discard maintenance complaints.",
    "reasoning_clarity": "Must cite maintenance window policy."
  }
}
```
