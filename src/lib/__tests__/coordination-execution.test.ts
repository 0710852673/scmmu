import { describe, expect, it, vi } from "vitest";
import {
  executeCoordinationRequest,
  createGenerateTextCoordinationProvider,
} from "../assistant/coordination-execution";

describe("coordination execution", () => {
  it("marks draft and proposed changes as approval-gated", async () => {
    const provider = {
      id: "fake",
      generate: vi.fn(async () => ({ text: "draft response", model: "fake-model" })),
    };

    const draft = await executeCoordinationRequest(
      {
        actorRole: "administrator",
        task: "Draft a notice",
        context: {},
        requestedAction: "draft",
      },
      provider,
    );
    const answer = await executeCoordinationRequest(
      {
        actorRole: "administrator",
        task: "Explain the release process",
        context: {},
        requestedAction: "answer",
      },
      provider,
    );

    expect(draft.requiresApproval).toBe(true);
    expect(answer.requiresApproval).toBe(false);
    expect(provider.generate).toHaveBeenCalledTimes(2);
  });

  it("keeps the provider adapter provider-neutral", async () => {
    const model = { modelId: "test-model" } as never;
    const adapter = createGenerateTextCoordinationProvider(model);
    expect(adapter.id).toBe("generate-text");
  });
});
