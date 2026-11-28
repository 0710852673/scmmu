import { hasPermission, type AuthorizationSubject } from "../security/authorization";

/**
 * Central guard for browser/server export handlers.
 * UI visibility is not authorization; callers must pass the authenticated subject.
 */
export function assertCanExport(subject: AuthorizationSubject | null | undefined): void {
  if (!hasPermission(subject, "reports.export")) throw new Error("FORBIDDEN");
}

export function exportCsvWithAuthorization<T extends Record<string, unknown>>(
  subject: AuthorizationSubject | null | undefined,
  rows: readonly T[],
  serialize: (rows: readonly T[]) => string,
): string {
  assertCanExport(subject);
  return serialize(rows);
}
