const SENSITIVE_KEY_PATTERN = /(token|secret|password|api[_-]?key|authorization|cookie|email|phone|address|nic|student|member|auth[_-]?uid|ip)/i;

export type SafeDiagnosticMetadata = Record<string, string | number | boolean | null>;

export function safeDiagnosticMetadata(
  input: Record<string, unknown>,
): SafeDiagnosticMetadata {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
      .slice(0, 30)
      .map(([key, value]) => [key, normalizeMetadataValue(value)]),
  );
}

function normalizeMetadataValue(value: unknown): string | number | boolean | null {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") return value.slice(0, 500);

  return "[redacted]";
}
