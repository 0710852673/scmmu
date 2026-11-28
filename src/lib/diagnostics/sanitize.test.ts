import { describe, expect, it } from "vitest";
import { sanitizeDiagnostic } from "./sanitize";

describe("diagnostic sanitization", () => {
  it("drops credential and personal-data keys and bounds text", () => {
    const result = sanitizeDiagnostic({
      code: "release-letter.failed",
      severity: "error",
      message: "x".repeat(400),
      metadata: {
        token: "secret",
        email: "member@example.com",
        route: "/portal/admin/release-letters",
        attempt: 2,
        nested: { unsafe: true },
      },
    });

    expect(result.message).toHaveLength(240);
    expect(result.metadata).toEqual({
      route: "/portal/admin/release-letters",
      attempt: 2,
    });
  });
});
