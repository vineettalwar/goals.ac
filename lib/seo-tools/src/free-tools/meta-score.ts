export type MetaScoreOptions = {
  h1?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
};

const SPAMMY = /\b(lorem ipsum|click here|untitled|buy now!!!|cheap seo)\b/i;

function wordSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function overlapRatio(a: string, b: string): number {
  const sa = wordSet(a);
  const sb = wordSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let shared = 0;
  for (const w of sa) if (sb.has(w)) shared += 1;
  return shared / Math.min(sa.size, sb.size);
}

function hasRepeatedWord(text: string): boolean {
  const counts = new Map<string, number>();
  for (const w of text.toLowerCase().split(/\s+/).filter(Boolean)) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
    if ((counts.get(w) ?? 0) >= 3) return true;
  }
  return false;
}

export function scoreMetaTags(
  title: string | null,
  description: string | null,
  options: MetaScoreOptions = {},
) {
  const titleLen = title?.length ?? 0;
  const descLen = description?.length ?? 0;
  const issues: string[] = [];
  let score = 100;

  if (!title) {
    score -= 35;
    issues.push("Missing page title");
  } else {
    if (titleLen < 30 || titleLen > 60) {
      score -= 12;
      issues.push(`Title length ${titleLen} (ideal 30–60)`);
    }
    if (title === title.toUpperCase() && /[A-Z]/.test(title) && titleLen > 8) {
      score -= 8;
      issues.push("Title is all caps — reads as spam in SERPs");
    }
    if (!/\s/.test(title.trim())) {
      score -= 8;
      issues.push("Title is a single token — add a readable phrase");
    }
    if (hasRepeatedWord(title)) {
      score -= 8;
      issues.push("Title repeats the same word 3+ times");
    }
    if (SPAMMY.test(title) || /^home$/i.test(title.trim()) || /^untitled$/i.test(title.trim())) {
      score -= 10;
      issues.push("Title looks like a placeholder or spam phrase");
    }
  }

  if (!description) {
    score -= 35;
    issues.push("Missing meta description");
  } else {
    if (descLen < 50 || descLen > 160) {
      score -= 12;
      issues.push(`Description length ${descLen} (ideal 50–160)`);
    }
    if (SPAMMY.test(description)) {
      score -= 10;
      issues.push("Description contains spammy placeholder phrasing");
    }
    if (descLen >= 50 && !/[.!?…]["']?\s*$/.test(description.trim())) {
      score -= 4;
      issues.push("Description does not end with sentence punctuation");
    }
  }

  if (title && description) {
    if (title.trim().toLowerCase() === description.trim().toLowerCase()) {
      score -= 15;
      issues.push("Title and description are identical");
    } else if (overlapRatio(title, description) >= 0.85) {
      score -= 10;
      issues.push("Description is nearly the same wording as the title");
    }
  }

  const h1 = options.h1?.trim() || null;
  if ("h1" in options && title && h1) {
    const ratio = overlapRatio(title, h1);
    if (ratio < 0.15) {
      score -= 8;
      issues.push("Title and H1 barely overlap — align the primary topic");
    }
  }

  if ("ogTitle" in options || "ogDescription" in options) {
    if (title && options.ogTitle?.trim() && options.ogTitle.trim() !== title.trim()) {
      score -= 3;
      issues.push("og:title differs from the HTML title");
    }
    if (
      description &&
      options.ogDescription?.trim() &&
      options.ogDescription.trim() !== description.trim()
    ) {
      score -= 3;
      issues.push("og:description differs from the meta description");
    }
    if (title && !options.ogTitle?.trim()) {
      score -= 4;
      issues.push("Missing og:title");
    }
    if (description && !options.ogDescription?.trim()) {
      score -= 4;
      issues.push("Missing og:description");
    }
  }

  return { score: Math.max(0, score), issues, titleLen, descLen };
}
