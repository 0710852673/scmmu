import { supabaseAdmin } from "@/integrations/supabase/client.server";

function safeText(value: string, max: number) {
  return value
    .replace(/(password|token|secret|api[_-]?key|authorization|cookie)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/https?:\/\/[^\s?]+\?[^\s]*/g, "[url]")
    .slice(0, max);
}

async function fingerprint(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Best-effort server error capture. Never lets logging break the response. */
export async function recordServerError(error: unknown, request: Request) {
  try {
    const name = error instanceof Error ? error.name : "Error";
    const message = safeText(error instanceof Error ? error.message : String(error), 500);
    const route = new URL(request.url).pathname.slice(0, 240);
    const method = request.method.slice(0, 12);
    const key = await fingerprint(`${name}: ${message}`);
    const { error: logError } = await (supabaseAdmin as any).rpc("record_error_event", {
      _fingerprint: key,
      _error_name: name,
      _message: message || "Unhandled server error",
      _route: route,
      _method: method,
    });
    if (logError) console.error("[Error capture] Could not store server error:", logError.message);
  } catch (captureError) {
    console.error("[Error capture] Logging failed:", captureError instanceof Error ? captureError.name : "UnknownError");
  }
}
