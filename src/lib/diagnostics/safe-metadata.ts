const SENSITIVE_KEY_PATTERN = /(token|secret|password|api[_-]?key|authorization|cookie|email|phone|address|nic|student|member|auth[_-]?uid|ip)/i;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const IPV6_PATTERN = /\b(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}\b/i;

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

  if (typeof value === "string") {
    if (IPV4_PATTERN.test(value) || IPV6_PATTERN.test(value)) return "[redacted]";
    return value.slice(0, 500);
  }

  return "[redacted]";
}
