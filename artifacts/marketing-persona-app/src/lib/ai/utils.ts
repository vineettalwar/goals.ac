export function sanitizeJsonControlChars(raw: string): string {
  // Remove control characters that break JSON.parse inside string values
  return raw.replace(/[\x00-\x1F\x7F]/g, (char) => {
    switch (char) {
      case "\n": return "\\n";
      case "\r": return "\\r";
      case "\t": return "\\t";
      default: return "";
    }
  });
}

export function extractJsonBlock(raw: string): string {
  const trimmed = raw.trim();
  // Strip markdown code fences
  const stripped = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  // Find the outermost JSON array or object
  const arrayStart = stripped.indexOf("[");
  const objStart = stripped.indexOf("{");

  if (arrayStart === -1 && objStart === -1) return stripped;

  const start =
    arrayStart === -1 ? objStart : objStart === -1 ? arrayStart : Math.min(arrayStart, objStart);

  const startChar = stripped[start];
  const endChar = startChar === "[" ? "]" : "}";
  const lastIdx = stripped.lastIndexOf(endChar);

  if (lastIdx === -1) return stripped;
  return stripped.slice(start, lastIdx + 1);
}

export function cleanAndParse<T>(raw: string): T {
  const block = extractJsonBlock(raw);
  try {
    return JSON.parse(block) as T;
  } catch {
    const sanitized = sanitizeJsonControlChars(block);
    return JSON.parse(sanitized) as T;
  }
}
