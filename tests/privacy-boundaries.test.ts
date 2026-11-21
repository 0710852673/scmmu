import { describe, expect, it } from "vitest";
import { safeDiagnosticMetadata } from "../src/lib/diagnostics/safe-metadata";
import {
  buildCoordinationSystemPrompt,
  sanitizeCoordinationContext,
} from "../src/lib/assistant/coordination-contract";

describe("SCCMU privacy boundaries", () => {
  it("removes secret, private, and IP-like diagnostic values", () => {
    expect(
      safeDiagnosticMetadata({
        route: "/portal",
        token: "secret",
        email: "user@example.com",
        clientIp: "192.168.1.20",
        detail: "safe detail",
        nested: { shouldNotBeSerialized: true },
      }),
    ).toEqual({
      route: "/portal",
      detail: "safe detail",
      nested: "[redacted]",
    });
  });

  it("sanitizes nested coordination context and bounds arrays", () => {
    const result = sanitizeCoordinationContext({
      public: { status: "ok", email: "hidden@example.com" },
      token: "hidden",
      items: Array.from({ length: 60 }, (_, index) => index),
    });

    expect(result).toEqual({
      public: { status: "ok" },
      items: Array.from({ length: 50 }, (_, index) => index),
    });
  });

  it("requires human approval for side effects", () => {
    const prompt = buildCoordinationSystemPrompt();
    expect(prompt).toContain("Require explicit human approval");
    expect(prompt).toContain("never claim that an action was executed");
  });
});
