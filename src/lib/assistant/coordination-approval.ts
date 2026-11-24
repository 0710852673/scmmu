import type { CoordinationRequest } from "./coordination-contract";

export function requiresHumanApproval(
  request: Pick<CoordinationRequest, "requestedAction">,
): boolean {
  return request.requestedAction !== "answer";
}

export function isReadOnlyCoordinationRequest(
  request: Pick<CoordinationRequest, "requestedAction">,
): boolean {
  return request.requestedAction === "answer";
}
