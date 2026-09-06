/**
 * Scans markdown for unfilled template placeholder tokens that should block
 * or warn before a piece goes live.
 *
 * Pure, no I/O, no side effects. The regex intentionally excludes markdown
 * link labels `[text](url)` and reference links `[text][ref]` via negative
 * lookahead so normal inline links never false-positive.
 */

/**
 * Returns the distinct placeholder strings found in `markdown`, e.g.
 * `["[Company Name]", "TODO", "lorem ipsum"]`. Empty array = clean.
 *
 * Detected patterns:
 * - Bracket slots not followed by `(` or `[` that look like template tokens:
 *   title-cased multi-word phrases (`[Company Name]`), slash-separated roles
 *   (`[CEO/Founder Name]`), comma-separated lists (`[Name, Title, Company]`),
 *   and phrases starting with "Your" or "Insert" (`[Your Logo Here]`).
 * - Whole-word `TODO`, `TBD`, `FIXME`.
 * - `Lorem ipsum` (case-insensitive).
 */
export function findPublishPlaceholders(markdown: string): string[] {
  const found = new Set<string>();

  // Bracket tokens — exclude markdown links [text](url) and reference links [text][ref]
  const bracketRe = /\[([^\]]+)\](?!\(|\[)/g;
  let m: RegExpExecArray | null;
  while ((m = bracketRe.exec(markdown)) !== null) {
    if (isPlaceholderBracket(m[1]!.trim())) {
      found.add(m[0]!.trim());
    }
  }

  // Whole-word bareword tokens
  const bareRe = /\b(TODO|TBD|FIXME)\b/g;
  while ((m = bareRe.exec(markdown)) !== null) {
    found.add(m[1]!);
  }

  // Lorem ipsum filler
  if (/lorem\s+ipsum/i.test(markdown)) {
    found.add("lorem ipsum");
  }

  return [...found];
}

/**
 * Returns true when the bracket inner text looks like an unfilled template
 * slot rather than a real word or proper noun.
 */
function isPlaceholderBracket(inner: string): boolean {
  // [Your Name] / [Insert Quote Here]
  if (/^(?:your|insert)\s/i.test(inner)) return true;
  // [CEO/Founder Name] — slash between word-chars
  if (/\w+\/\w+/.test(inner)) return true;
  // [Name, Title, Company] — comma-separated title-cased words
  if (/^[A-Z][A-Za-z]+(?:,\s*[A-Z][A-Za-z]+)+$/.test(inner)) return true;
  // [Company Name] / [Product Launch Date] — two or more Title-Cased Words
  if (/^(?:[A-Z][A-Za-z]*\s+)+[A-Z][A-Za-z]*$/.test(inner)) return true;
  return false;
}
