/**
 * All landing-page copy. Facts are restated from README.md (challenge modules,
 * canonical demo tickets, trust requirements). Do not add claims that are not
 * in the repo's docs; unknowns are typed `null` and render nothing.
 */

export interface Beat {
  id: "capture" | "map" | "teach";
  index: string;
  label: string;
  title: string;
  body: string;
}

export const landing = {
  eyebrow: "ElevenLabs × Hack-Nation · AI Apprentice",
  hero: {
    lines: ["It watches the expert.", "It asks why.", "It teaches the next hire."],
    sub: "Capture how an experienced support engineer makes triage decisions, turn that judgment into a verified Work Map, and use it to coach a new engineer on a ticket they've never seen.",
    primary: "Launch console",
    secondary: "See how it works",
  },
  beats: [
    {
      id: "capture",
      index: "01",
      label: "Capture",
      title: "It watches the expert work.",
      body: "The expert shares their screen and triages real tickets. At natural pauses, never mid-typing, the Apprentice asks short voice questions about what's on screen. At least one of them surfaces a guardrail.",
    },
    {
      id: "map",
      index: "02",
      label: "Map",
      title: "It turns judgment into a Work Map.",
      body: "A spoken debrief asks what the session didn't answer, then the Apprentice teaches the process back for the expert to confirm or correct. Every step and guardrail links to a screen moment and the expert's own words.",
    },
    {
      id: "teach",
      index: "03",
      label: "Teach",
      title: "It coaches the next hire.",
      body: "A new hire gets a case the expert never demonstrated. The tutor watches, catches a wrong decision before it's saved, and explains the correction with the expert's reasoning.",
    },
  ] satisfies Beat[],
  /** HUD tags pinned to shards during the Capture beat (from the canonical demo tickets). */
  captureTags: [
    { k: "T001", v: "Scope · all customers → P1" },
    { k: "T003", v: "Potential data loss" },
    { k: "Guardrail", v: "Stop + escalate" },
  ],
  demo: {
    label: "Demo",
    title: "Support triage, end to end.",
    caption: "Reference demo · support-ticket workspace with the AI Apprentice side panel",
    src: "/AI_Apprentice_Support_Triage_Demo.mp4",
  },
  trust: [
    { title: "Off the record", body: "The expert can pause recording at any moment." },
    { title: "PII redaction", body: "A redaction layer strips emails, phone numbers, card numbers and API keys from captured text." },
    { title: "Evidence-linked", body: "Each step in the Work Map points back to the screen moment it came from." },
  ],
  closing: {
    title: "The why behind every decision, passed on.",
    cta: "Launch console",
  },
  footer: {
    credit: "Built for the ElevenLabs × Hack-Nation 7th Global AI Hackathon",
    repo: "https://github.com/Charon-68/Jarvis-HackNation",
    /** C1: team name / members — not supplied yet. */
    team: null as string | null,
  },
} as const;
