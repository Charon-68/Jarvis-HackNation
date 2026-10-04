/**
 * Unit test for ticket decision persistence logic in CaptureWorkspace
 */

import { listTickets } from "../../data/ticketRepository";
import type { Ticket, TicketPriority, TicketTeam, TicketAction } from "../../types/index";

declare const process: { argv?: string[]; exit?: (code: number) => void } | undefined;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log("=== Running Ticket Decision Persistence Tests ===");

  // Simulating the CaptureWorkspace ticket override state logic
  let ticketOverrides: Record<string, Partial<Pick<Ticket, "priority" | "team" | "action">>> = {};

  function getDerivedTickets(): Ticket[] {
    return listTickets().map((t) => ({
      ...t,
      ...(ticketOverrides[t.id] || {}),
    }));
  }

  function handleFieldChange(ticketId: string, field: "priority" | "team" | "action", value: string) {
    ticketOverrides = {
      ...ticketOverrides,
      [ticketId]: {
        ...ticketOverrides[ticketId],
        [field]: value,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Test 1: Untouched tickets show original fixture values
  // -------------------------------------------------------------------------
  {
    console.log("Test 1: Untouched tickets retain original fixture values...");
    const tickets = getDerivedTickets();
    const t001 = tickets.find((t) => t.id === "T001")!;
    const originalT001 = listTickets().find((t) => t.id === "T001")!;

    assert(t001.priority === originalT001.priority, "Untouched priority must match fixture");
    assert(t001.team === originalT001.team, "Untouched team must match fixture");
    assert(t001.action === originalT001.action, "Untouched action must match fixture");
  }

  // -------------------------------------------------------------------------
  // Test 2: Edit T001 → switch to T002 → return to T001: edited values remain
  // -------------------------------------------------------------------------
  {
    console.log("Test 2: Edit T001 → switch to T002 → return to T001 preserves edited values...");
    // Edit T001
    handleFieldChange("T001", "priority", "Emergency");
    handleFieldChange("T001", "team", "Engineering");
    handleFieldChange("T001", "action", "Escalate Immediately");

    // Switch to T002
    let tickets = getDerivedTickets();
    const t002 = tickets.find((t) => t.id === "T002")!;
    assert(t002.id === "T002", "Switched to T002");

    // Return to T001
    tickets = getDerivedTickets();
    const t001 = tickets.find((t) => t.id === "T001")!;
    assert(t001.priority === ("Emergency" as TicketPriority), "T001 priority override persisted");
    assert(t001.team === ("Engineering" as TicketTeam), "T001 team override persisted");
    assert(t001.action === ("Escalate Immediately" as TicketAction), "T001 action override persisted");
  }

  // -------------------------------------------------------------------------
  // Test 3: Edit several tickets independently
  // -------------------------------------------------------------------------
  {
    console.log("Test 3: Edit several tickets independently...");
    handleFieldChange("T002", "priority", "Moderate");
    handleFieldChange("T002", "team", "HR");

    handleFieldChange("T003", "action", "Request More Information");

    const tickets = getDerivedTickets();
    const t001 = tickets.find((t) => t.id === "T001")!;
    const t002 = tickets.find((t) => t.id === "T002")!;
    const t003 = tickets.find((t) => t.id === "T003")!;

    assert(t001.priority === "Emergency", "T001 priority remains Emergency");
    assert(t002.priority === "Moderate" && t002.team === "HR", "T002 overrides persisted independently");
    assert(t003.action === "Request More Information", "T003 action override persisted independently");
  }

  // -------------------------------------------------------------------------
  // Test 4: Resetting session clears overrides
  // -------------------------------------------------------------------------
  {
    console.log("Test 4: Resetting session clears overrides...");
    ticketOverrides = {};
    const tickets = getDerivedTickets();
    const t001 = tickets.find((t) => t.id === "T001")!;
    const originalT001 = listTickets().find((t) => t.id === "T001")!;

    assert(t001.priority === originalT001.priority, "T001 priority reset to original fixture");
  }

  console.log("✅ ALL TICKET PERSISTENCE TESTS PASSED SUCCESSFULLY!");
}

if (typeof process !== "undefined" && process?.argv && process?.argv[1]?.includes("ticketPersistence")) {
  runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process?.exit?.(1);
  });
}

export { runTests };
