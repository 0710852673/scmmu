import { safeDiagnosticMetadata, type SafeDiagnosticMetadata } from "./safe-metadata";

export const INCIDENT_SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_STATUSES = ["open", "acknowledged", "resolved"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export type DiagnosticIncident = {
  id: string;
  createdAt: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  message: string;
  metadata: SafeDiagnosticMetadata;
};

export function createDiagnosticIncident(input: {
  id?: string;
  severity?: IncidentSeverity;
  message: string;
  metadata?: Record<string, unknown>;
  now?: Date;
}): DiagnosticIncident {
  const now = input.now ?? new Date();
  return {
    id: input.id ?? `incident-${now.getTime()}`,
    createdAt: now.toISOString(),
    severity: input.severity ?? "error",
    status: "open",
    message: input.message.slice(0, 500),
    metadata: safeDiagnosticMetadata(input.metadata ?? {}),
  };
}

export function updateDiagnosticIncidentStatus(
  incident: DiagnosticIncident,
  status: IncidentStatus,
): DiagnosticIncident {
  return { ...incident, status };
}
