/**
 * Gemini occasionally emits raw C0 control characters (e.g. literal \n, \r, \t)
 * inside JSON string values, which JSON.parse rejects. This function walks the
 * raw output character-by-character, tracking string boundaries, and escapes
 * any control character found inside a string region.
 */
export function sanitizeJsonControlChars(raw: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const code = raw.charCodeAt(i);

    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && inString) {
      out += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }

    if (inString && code < 0x20) {
      if (code === 0x0a) out += "\\n";
      else if (code === 0x0d) out += "\\r";
      else if (code === 0x09) out += "\\t";
      else out += `\\u${code.toString(16).padStart(4, "0")}`;
      continue;
    }

    out += ch;
  }

  return out;
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

export function normalizePagePath(url: string): string {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname || "/";
    if (!path.startsWith("/")) path = `/${path}`;
    const normalized = path.replace(/\/+$/, "");
    return normalized || "/";
  } catch {
    let path = url.startsWith("/") ? url : `/${url}`;
    const normalized = path.replace(/\/+$/, "");
    return normalized || "/";
  }
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
