function escapeJsonForHtml(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Escape JSON for safe embedding in HTML script tags. */
export function sanitizeJsonLd(data: unknown): string {
  return escapeJsonForHtml(JSON.stringify(data));
}

/** @deprecated Use sanitizeJsonLd */
export const jsonLdScriptContent = sanitizeJsonLd;

/** Escape JSON for safe display in HTML text nodes. */
export function sanitizeJsonForDisplay(data: unknown, space?: number): string {
  return escapeJsonForHtml(JSON.stringify(data, null, space));
}
