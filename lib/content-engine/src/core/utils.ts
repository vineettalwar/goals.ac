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

/**
 * Strips a known family of conversational model preamble and sign-off sentences
 * ("As an AI language model, I can help with that.", "Certainly! Here's the
 * article:", "I hope this helps!") from a plain string value.
 *
 * `extractJsonBlock` only removes text OUTSIDE the outermost JSON object or
 * array; a preamble sentence the model wrote INSIDE a string value (most often
 * `body_markdown`) survives `JSON.parse` completely untouched and ends up
 * published verbatim. This function is additive and narrow on purpose: it does
 * not change `extractJsonBlock` or `cleanAndParse`, so every existing consumer
 * of those two keeps its current behavior exactly. Callers who need this
 * protection call it themselves on the specific string fields they parsed out.
 *
 * Only matches at the very start or very end of the string, never mid-text: a
 * sentence that happens to mention "as an AI" in the middle of a real article
 * is left alone. False negatives here (an unusual preamble phrasing this list
 * does not cover) are far cheaper than a false positive that mangles real,
 * on-topic prose.
 */
export function stripModelPreamble(text: string): string {
  if (!text) return text;
  let out = text;

  const leadingPatterns: RegExp[] = [
    // "Certainly! Here's the article:" / "Sure, here is your post:"
    /^\s*(?:certainly|sure|of course|absolutely)!?,?\s*(?:here'?s|here is)\s+(?:the|your|a|an)\b[^\n]{0,80}[:\n]\s*/i,
    // "Here's the article you asked for:" on its own leading line.
    /^\s*here'?s\s+(?:the|your|a|an)\b[^\n]{0,80}:\s*\n+/i,
    // "As an AI language model, I ..." / "I'm an AI and ..."
    /^\s*as an ai(?: language model)?\b[^\n]{0,160}?[.!]\s+/i,
    /^\s*i'?m an ai\b[^\n]{0,160}?[.!]\s+/i,
  ];
  for (const pattern of leadingPatterns) {
    out = out.replace(pattern, "");
  }

  const trailingPatterns: RegExp[] = [
    /\s*(?:i hope (?:this|that) helps!?|let me know if you (?:need|have|want)[^\n]{0,120}[.!]?|feel free to (?:ask|reach out)[^\n]{0,120}[.!]?)\s*$/i,
  ];
  for (const pattern of trailingPatterns) {
    out = out.replace(pattern, "");
  }

  return out.trim();
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
