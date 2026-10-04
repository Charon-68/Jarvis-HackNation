/**
 * P1-03 — Demo Dataset Loader
 * Single workflow-data access layer that reads from shared/demo-tickets.json.
 * Components must import from here — never import the JSON directly.
 */

import type { Ticket, TicketAction, TicketPriority, TicketTeam } from "../types/index";

// Load from shared fixture; resolved via vite alias or relative path
import rawTickets from "../../../shared/demo-tickets.json";

// Cast through unknown so TS is happy with the narrow union types
const TICKETS: Ticket[] = (rawTickets as unknown[]).map((t) => t as Ticket);

/** Canonical expert sequence for the golden demo */
export const EXPERT_SEQUENCE: string[] = ["T001", "T002", "T003", "T005", "T006"];

/** Unseen training case (not in the expert sequence) */
export const TRAINING_CASE = {
  id: "T007",
  customer: "New Customer",
  issue: "12 customers lost transaction history after an update",
  scope: "Multiple customers — potential data loss",
  expectedPriority: "P1" as TicketPriority,
  expectedTeam: "Engineering" as TicketTeam,
  expectedAction: "STOP normal processing + escalate" as TicketAction,
  guardrail: "Possible data loss means stop normal processing and escalate.",
};

/** Return all demo tickets */
export function listTickets(): Ticket[] {
  return TICKETS;
}

/** Return a single ticket by ID */
export function getTicket(ticketId: string): Ticket | undefined {
  return TICKETS.find((t) => t.id === ticketId);
}

/** Return tickets for the expert canonical sequence only */
export function getExpertSequenceTickets(): Ticket[] {
  return EXPERT_SEQUENCE.map((id) => getTicket(id)).filter(
    (t): t is Ticket => t !== undefined,
  );
}

export default {
  listTickets,
  getTicket,
  getExpertSequenceTickets,
  EXPERT_SEQUENCE,
  TRAINING_CASE,
};
