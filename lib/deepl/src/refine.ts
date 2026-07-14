import { deeplTranslate } from "./client";

export type RefineContentFieldsInput = {
  title: string;
  bodyMarkdown: string;
  metaDescription?: string;
  seoTitle?: string;
};

export type RefineContentFieldsResult = RefineContentFieldsInput & {
  charCount: number;
};

export async function refineContentPieceFields(
  apiKey: string,
  fields: RefineContentFieldsInput,
  options: { targetLang: string; glossaryId?: string },
): Promise<RefineContentFieldsResult> {
  const entries: { key: keyof RefineContentFieldsInput; value: string }[] = [
    { key: "title", value: fields.title },
    { key: "bodyMarkdown", value: fields.bodyMarkdown },
  ];

  if (fields.metaDescription?.trim()) {
    entries.push({ key: "metaDescription", value: fields.metaDescription });
  }
  if (fields.seoTitle?.trim()) {
    entries.push({ key: "seoTitle", value: fields.seoTitle });
  }

  const charCount = entries.reduce((sum, entry) => sum + entry.value.length, 0);
  const { translations } = await deeplTranslate(
    apiKey,
    entries.map((entry) => entry.value),
    {
      targetLang: options.targetLang,
      sourceLang: "EN",
      glossaryId: options.glossaryId,
    },
  );

  const refined: RefineContentFieldsInput = {
    title: fields.title,
    bodyMarkdown: fields.bodyMarkdown,
    metaDescription: fields.metaDescription,
    seoTitle: fields.seoTitle,
  };

  entries.forEach((entry, index) => {
    const translated = translations[index];
    if (translated) {
      refined[entry.key] = translated;
    }
  });

  return { ...refined, charCount };
}
