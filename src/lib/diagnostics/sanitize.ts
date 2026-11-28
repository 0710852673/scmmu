const SENSITIVE_KEY = /(token|secret|password|authorization|cookie|email|phone|address|ip)/i;

export type DiagnosticInput = Record<string, unknown>;
export type SafeDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  metadata: Record<string, string | number | boolean>;
};

function primitive(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

export function sanitizeDiagnostic(input: DiagnosticInput): SafeDiagnostic {
  const metadata: SafeDiagnostic["metadata"] = {};
  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (!primitive(value)) continue;
    const normalized = typeof value === "string" ? value.slice(0, 160) : value;
    metadata[key] = normalized;
  }

  const code = typeof input.code === "string" ? input.code.slice(0, 80) : "UNKNOWN";
  const message = typeof input.message === "string" ? input.message.slice(0, 240) : "Unknown diagnostic";
  const severity =
    input.severity === "critical" || input.severity === "error" || input.severity === "warning"
      ? input.severity
      : "info";

  return { code, severity, message, metadata };
}
