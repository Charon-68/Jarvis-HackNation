# AI Apprentice — Integration Contracts & Agent Spec

This document defines the complete interface contracts connecting:

1. **Lovable / React Frontend** (Expert UI + Side Panel Voice Interface + Work Map Timeline)
2. **ElevenLabs Platform** (Real-Time Voice AI Apprentice + Bilingual Intern Coach Agents)
3. **Claude / FastAPI Backend** (Tacit Knowledge Extraction, Work Map Generation & SOP Synthesis)

---

## 1. ElevenLabs Agent IDs & Endpoints

| Resource | Value / ID | Notes |
| --- | --- | --- |
| **AI Apprentice Agent** | `<YOUR_APPRENTICE_AGENT_ID>` | Real-time observation, tacit knowledge probing, debrief & teachback |
| **Trainee Simulator & Evaluator** | `<YOUR_TRAINEE_AGENT_ID>` | Bilingual English/Hindi interactive coach with auto evaluation |
| **React Package** | `@elevenlabs/react` | WebRTC / WebSocket real-time audio |
| **TTS Model** | `eleven_v4_turbo` | Streaming latency level 4 with expressive mode |

---

## 2. Frontend Client Tool Handlers (`@elevenlabs/react`)

Person 1 registers these client tools in the `useConversation` hook:

```tsx
import { useConversation } from "@elevenlabs/react";

const conversation = useConversation({
  clientTools: {
    // 1. Called by AI Apprentice to inspect active complaint row
    get_ticket_context: ({ ticket_id }: { ticket_id: string }) => {
      return JSON.stringify({
        ticket_id: activeComplaint?.id || ticket_id,
        customer_tier: activeComplaint?.customerTier || "Enterprise",
        subject: activeComplaint?.subject || "Complaint summary",
        details: activeComplaint?.details || "Detailed complaint description",
        status: activeComplaint?.status || "Pending",
      });
    },

    // 2. Called when the expert explains their triage logic / heuristics
    log_expert_decision: ({
      ticket_id,
      action_taken,
      decision_rationale,
    }: {
      ticket_id: string;
      action_taken: string;
      decision_rationale: string;
    }) => {
      setTriageDecisions((prev) => [
        ...prev,
        { ticket_id, action_taken, decision_rationale },
      ]);
      return JSON.stringify({ status: "logged", ticket_id });
    },

    // 3. Called during exit debrief to generate the Work Map
    trigger_debrief_summary: async ({
      session_id,
      tickets_processed,
    }: {
      session_id: string;
      tickets_processed?: number;
    }) => {
      const response = await fetch("/api/work-maps/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          tickets: triageDecisions,
        }),
      });
      const data = await response.json();
      return JSON.stringify({ status: "work_map_generated", session_id });
    },
  },
});
```

---

## 3. Screen Awareness & DOM Context Updates

When the expert clicks a row or takes an action in the spreadsheet UI:

```ts
// Silent injection — updates LLM context without speaking
conversation.sendContextualUpdate(
  `[SPREADSHEET UPDATE]: Active Row #${row.id} | Tier: ${row.tier} | Issue: ${row.summary} | Action: ${row.action}`,
  "active_row_state"
);
```

---

## 4. Backend Work Map & Synthesis Contract (`POST /api/work-maps/generate`)

Person 3's FastAPI endpoint specification using **camelCase** types:

### Request Body

```json
{
  "session_id": "sess_1728001234",
  "tickets": [
    {
      "ticket_id": "TK-8821",
      "action_taken": "Escalate to Tier 2",
      "decision_rationale": "Downtime within SLA; enterprise client requires technical lead review."
    }
  ]
}
```

### Response Body (`WorkMap` Schema)

```json
{
  "status": "success",
  "sessionId": "sess_1728001234",
  "sopMarkdown": "# SOP: Customer Complaint Triage\n...",
  "steps": [
    {
      "stepNumber": 1,
      "totalSteps": 5,
      "title": "Evaluate Enterprise Downtime Complaint",
      "screenMoment": {
        "timestamp": "02:14",
        "entityId": "TK-8821",
        "fieldName": "priority"
      },
      "decision": "Escalate to Tier 2 Support",
      "expertQuote": "Enterprise complaints with SLA risk never get discarded.",
      "expertReason": "Downtime is within contract SLA but customer tier requires human lead review.",
      "timestampMs": 134000,
      "guardrails": [
        "Never discard enterprise customer tickets without lead review.",
        "Verify uptime percentage before issuing credit."
      ]
    }
  ],
  "testScenario": "Enterprise customer demanding instant refund for 10-minute minor latency.",
  "rubric": {
    "policyCompliance": "Do not grant instant refund if under 99.9% SLA.",
    "deescalation": "Acknowledge frustration with downtime first."
  }
}
```

---

## 5. Bilingual Trainee Mentoring (English & Hindi)

- **Language Preference Flow:** Trainee Coach prompts: *"Welcome to your ticket triage training session! Before we begin, would you prefer to do this session in English or Hindi (हिन्दी)?"*
- **Adaptive Spoken Coaching:** Dynamically adapts all scenarios, spoken feedback, and corrections to English, Hindi, or Hinglish while keeping technical triage terms intact.
- **Automated Post-Call Evaluation:** Evaluates reasoning and classification accuracy regardless of response language.
