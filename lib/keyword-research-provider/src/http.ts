const DEFAULT_TIMEOUT_MS = 30_000;

export class SemrushApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SemrushApiError";
  }
}

/** Redact Semrush API keys and legacy query-string secrets from arbitrary text. */
export function redactSemrushSecrets(raw: string): string {
  return raw
    .replace(/([?&]key=)[^&\s'"]+/gi, "$1[redacted]")
    .replace(/\bkey=[^&\s'"]+/gi, "key=[redacted]")
    .replace(/\bapikey\s+[a-z0-9_-]+/gi, "apikey [redacted]")
    .replace(/\bApikey\s+[a-z0-9_-]+/gi, "Apikey [redacted]")
    .replace(/https?:\/\/api\.semrush\.com[^\s'"]*/gi, "https://api.semrush.com/[redacted]");
}

/** Strip API keys from upstream error text before surfacing to users or logs. */
export function sanitizeSemrushErrorMessage(raw: string): string {
  const trimmed = redactSemrushSecrets(raw.trim());
  if (!trimmed) return "Semrush API request failed";

  if (trimmed.toUpperCase().startsWith("ERROR")) {
    return trimmed.replace(/^ERROR\s+\d+\s*::\s*/i, "").trim() || "Semrush API error";
  }

  return trimmed.slice(0, 240);
}

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new SemrushApiError("Semrush API request timed out");
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new SemrushApiError(sanitizeSemrushErrorMessage(msg));
  } finally {
    clearTimeout(timeout);
  }
}
