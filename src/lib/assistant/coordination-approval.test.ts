import { describe, expect, it } from "vitest";
import { isReadOnlyCoordinationRequest, requiresHumanApproval } from "./coordination-approval";

describe("coordination action safety", () => {
  it("keeps answer requests read-only", () => {
    expect(isReadOnlyCoordinationRequest({ requestedAction: "answer" })).toBe(true);
    expect(requiresHumanApproval({ requestedAction: "answer" })).toBe(false);
  });

  it("requires approval for drafts and proposed changes", () => {
    expect(requiresHumanApproval({ requestedAction: "draft" })).toBe(true);
    expect(requiresHumanApproval({ requestedAction: "propose_change" })).toBe(true);
  });
});
