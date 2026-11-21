import { generateText } from "ai";
import {
  buildCoordinationSystemPrompt,
  type CoordinationProvider,
  type CoordinationRequest,
} from "./coordination-contract";

export type CoordinationExecution = {
  text: string;
  model?: string;
  requiresApproval: boolean;
  requestedAction: CoordinationRequest["requestedAction"];
};

export async function executeCoordinationRequest(
  request: CoordinationRequest,
  provider: CoordinationProvider,
): Promise<CoordinationExecution> {
  const result = await provider.generate({
    system: buildCoordinationSystemPrompt(),
    user: request.task,
    metadata: {
      actorRole: request.actorRole,
      requestedAction: request.requestedAction,
    },
  });

  return {
    text: result.text,
    model: result.model,
    requestedAction: request.requestedAction,
    requiresApproval: request.requestedAction !== "answer",
  };
}

export function createGenerateTextCoordinationProvider(
  model: Parameters<typeof generateText>[0]["model"],
): CoordinationProvider {
  return {
    id: "generate-text",
    async generate({ system, user, metadata }) {
      const result = await generateText({
        model,
        system,
        prompt: user + "\n\nRequested action: " + metadata.requestedAction,
      });
      return { text: result.text, model: String(model) };
    },
  };
}
