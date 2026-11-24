import { describe, expect, it } from "vitest";
import { createDiagnosticIncident, updateDiagnosticIncidentStatus } from "./incident";

describe("diagnostic incidents", () => {
  it("creates privacy-safe bounded incidents", () => {
    const incident = createDiagnosticIncident({
      id: "incident-1",
      message: "A".repeat(700),
      metadata: { email: "private@example.com", attempt: 2 },
      now: new Date("2026-11-21T00:00:00.000Z"),
    });

    expect(incident.message).toHaveLength(500);
    expect(incident.metadata).toEqual({ attempt: 2 });
    expect(incident.status).toBe("open");
  });

  it("supports explicit status transitions", () => {
    const incident = createDiagnosticIncident({ id: "incident-2", message: "failed" });
    expect(updateDiagnosticIncidentStatus(incident, "acknowledged").status).toBe("acknowledged");
    expect(updateDiagnosticIncidentStatus(incident, "resolved").status).toBe("resolved");
  });
});
