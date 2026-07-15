/** Map goals.ac language codes to DeepL target_lang values. */
const LANGUAGE_TO_DEEPL: Record<string, string> = {
  en: "EN-US",
  "en-GB": "EN-GB",
  fr: "FR",
  de: "DE",
  es: "ES",
  it: "IT",
  pt: "PT-BR",
  nl: "NL",
  sv: "SV",
  pl: "PL",
  ja: "JA",
  ko: "KO",
  "zh-CN": "ZH-HANS",
  zh: "ZH-HANS",
  "zh-TW": "ZH-HANT",
  tr: "TR",
  ar: "AR",
  hi: "HI",
  da: "DA",
  fi: "FI",
  no: "NB",
  cs: "CS",
  ro: "RO",
  hu: "HU",
  el: "EL",
  id: "ID",
  vi: "VI",
  th: "TH",
  sk: "SK",
  bg: "BG",
  he: "HE",
};

export function deeplTargetLangForLanguage(code: string | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim();
  if (!normalized || normalized === "en") return null;
  return LANGUAGE_TO_DEEPL[normalized] ?? null;
}

export function isDeeplSupportedLanguage(code: string | undefined): boolean {
  return deeplTargetLangForLanguage(code) != null;
}
