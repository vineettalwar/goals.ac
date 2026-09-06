const GSC_INSPECTION_URL =
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

export type GscUrlInspectionInput = {
  accessToken: string;
  siteUrl: string;
  inspectionUrl: string;
  languageCode?: string;
};

export type GscUrlInspectionResult = {
  inspectionUrl: string;
  indexStatusResult?: {
    verdict?: string | null;
    coverageState?: string | null;
    robotsTxtState?: string | null;
    indexingState?: string | null;
    lastCrawlTime?: string | null;
    pageFetchState?: string | null;
    googleCanonical?: string | null;
    userCanonical?: string | null;
  } | null;
  raw?: unknown;
};

export async function inspectUrl(
  input: GscUrlInspectionInput,
): Promise<GscUrlInspectionResult> {
  const { accessToken, siteUrl, inspectionUrl, languageCode } = input;

  const res = await fetch(GSC_INSPECTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      siteUrl,
      inspectionUrl,
      ...(languageCode ? { languageCode } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `GSC URL Inspection failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    inspectionResult?: {
      indexStatusResult?: Record<string, unknown>;
    };
  };

  const idx = data.inspectionResult?.indexStatusResult;

  return {
    inspectionUrl,
    indexStatusResult: idx
      ? {
          verdict: (idx.verdict as string) ?? null,
          coverageState: (idx.coverageState as string) ?? null,
          robotsTxtState: (idx.robotsTxtState as string) ?? null,
          indexingState: (idx.indexingState as string) ?? null,
          lastCrawlTime: (idx.lastCrawlTime as string) ?? null,
          pageFetchState: (idx.pageFetchState as string) ?? null,
          googleCanonical: (idx.googleCanonical as string) ?? null,
          userCanonical: (idx.userCanonical as string) ?? null,
        }
      : null,
    raw: data.inspectionResult,
  };
}
