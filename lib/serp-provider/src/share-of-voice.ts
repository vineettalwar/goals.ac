export type LlmPlatform = "chat_gpt" | "google";

export type ShareOfVoiceEntry = {
  label: string;
  isTarget: boolean;
  mentions: number | null;
  sharePct: number | null;
};

export type CrossAggregatedItem = {
  key?: string | null;
  platform?: Array<{
    key?: string | null;
    mentions?: number | null;
    ai_search_volume?: number | null;
  } | null> | null;
};

export type CrossOutcome = {
  platform: LlmPlatform;
  status: "success" | "error";
  items: CrossAggregatedItem[];
};

export type DetectedTarget = {
  type: "domain" | "keyword";
  value: string;
};

/** Domain = has a dot and no spaces; otherwise keyword. */
export function detectTarget(rawInput: string): DetectedTarget {
  const trimmed = rawInput.trim();
  const looksLikeDomain =
    trimmed.length > 0 && !/\s/.test(trimmed) && trimmed.includes(".");

  if (looksLikeDomain) {
    let value = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
    value = value.split("/")[0] ?? value;
    return { type: "domain", value: value.toLowerCase() };
  }

  return { type: "keyword", value: trimmed };
}

export type CompetitorGroup = {
  label: string;
  detected: DetectedTarget;
};

/**
 * Resolve competitors: detect type, dedupe case-insensitively, drop target
 * collisions. Caps are applied by the caller (max 5).
 */
export function resolveCompetitorGroups(
  targetValue: string,
  competitors: string[],
): CompetitorGroup[] {
  const seen = new Set<string>([targetValue.toLowerCase()]);
  const groups: CompetitorGroup[] = [];
  for (const competitor of competitors) {
    const detected = detectTarget(competitor);
    if (!detected.value) continue;
    const dedupeKey = detected.value.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    groups.push({ label: detected.value, detected });
  }
  return groups;
}

export function sumNullable(values: Array<number | null>): number | null {
  let total = 0;
  let hasValue = false;
  for (const value of values) {
    if (value != null) {
      total += value;
      hasValue = true;
    }
  }
  return hasValue ? total : null;
}

export function roundOrNull(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Math.round(value);
}

/**
 * Build Share of Voice from per-platform cross_aggregated results.
 * Returns null when there are no competitors or every call failed.
 */
export function computeShareOfVoice(
  crossOutcomes: CrossOutcome[],
  targetKey: string,
  competitorKeys: string[],
): { platforms: LlmPlatform[]; entries: ShareOfVoiceEntry[] } | null {
  if (competitorKeys.length === 0) return null;
  const successful = crossOutcomes.filter((c) => c.status === "success");
  if (successful.length === 0) return null;

  const requestedKeys = [targetKey, ...competitorKeys];
  const labelByKey = new Map(
    requestedKeys.map((key) => [key.toLowerCase(), key]),
  );
  const mentionsByKey = new Map<string, number | null>(
    requestedKeys.map((key) => [key.toLowerCase(), null]),
  );

  for (const outcome of successful) {
    for (const item of outcome.items) {
      if (item.key == null) continue;
      const key = item.key.toLowerCase();
      if (!labelByKey.has(key)) continue;
      const platformMentions = sumNullable(
        (item.platform ?? []).map((entry) => roundOrNull(entry?.mentions)),
      );
      const prior = mentionsByKey.get(key) ?? null;
      mentionsByKey.set(key, sumNullable([prior, platformMentions]));
    }
  }

  const denominator = sumNullable(Array.from(mentionsByKey.values())) ?? 0;
  const targetLower = targetKey.toLowerCase();

  const entries = Array.from(mentionsByKey.entries())
    .map(([key, mentions]) => ({
      label: labelByKey.get(key) ?? key,
      isTarget: key === targetLower,
      mentions,
      sharePct:
        mentions == null || denominator <= 0
          ? null
          : (mentions / denominator) * 100,
    }))
    .sort((a, b) => (b.mentions ?? -1) - (a.mentions ?? -1));

  return {
    platforms: successful.map((outcome) => outcome.platform),
    entries,
  };
}
