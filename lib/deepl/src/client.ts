export type DeeplTranslateOptions = {
  targetLang: string;
  glossaryId?: string;
  sourceLang?: string;
};

export type DeeplTranslateResult = {
  translations: string[];
  billedCharacters?: number;
};

export type DeeplUsageResult = {
  characterCount: number;
  characterLimit: number;
};

function deeplApiBase(apiKey: string): string {
  return apiKey.trim().endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com";
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `DeepL-Auth-Key ${apiKey.trim()}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

export async function deeplTranslate(
  apiKey: string,
  texts: string[],
  options: DeeplTranslateOptions,
): Promise<DeeplTranslateResult> {
  const nonEmpty = texts.map((text) => text ?? "");
  if (nonEmpty.length === 0) {
    return { translations: [] };
  }

  const body = new URLSearchParams();
  for (const text of nonEmpty) {
    body.append("text", text);
  }
  body.append("target_lang", options.targetLang);
  if (options.sourceLang) {
    body.append("source_lang", options.sourceLang);
  }
  if (options.glossaryId?.trim()) {
    body.append("glossary_id", options.glossaryId.trim());
  }
  body.append("preserve_formatting", "1");

  const res = await fetch(`${deeplApiBase(apiKey)}/v2/translate`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body,
  });

  const payload = (await res.json().catch(() => null)) as
    | { translations?: { text: string }[]; message?: string }
    | null;

  if (!res.ok) {
    const message = payload?.message ?? `DeepL translate failed (${res.status})`;
    throw new Error(message);
  }

  const translations = (payload?.translations ?? []).map((entry) => entry.text);
  if (translations.length !== nonEmpty.length) {
    throw new Error("DeepL returned an unexpected number of translations");
  }

  return { translations };
}

export async function deeplGetUsage(apiKey: string): Promise<DeeplUsageResult> {
  const res = await fetch(`${deeplApiBase(apiKey)}/v2/usage`, {
    method: "GET",
    headers: authHeaders(apiKey),
  });

  const payload = (await res.json().catch(() => null)) as
    | { character_count?: number; character_limit?: number; message?: string }
    | null;

  if (!res.ok) {
    const message = payload?.message ?? `DeepL usage check failed (${res.status})`;
    throw new Error(message);
  }

  return {
    characterCount: payload?.character_count ?? 0,
    characterLimit: payload?.character_limit ?? 0,
  };
}

export async function testDeeplConnection(apiKey: string): Promise<{ ok: true; note?: string } | { ok: false; error: string }> {
  try {
    const usage = await deeplGetUsage(apiKey);
    const remaining = Math.max(usage.characterLimit - usage.characterCount, 0);
    return {
      ok: true,
      note: `Connected. ${remaining.toLocaleString()} characters remaining this billing period.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "DeepL connection failed",
    };
  }
}
