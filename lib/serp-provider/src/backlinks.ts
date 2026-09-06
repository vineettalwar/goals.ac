/**
 * DataForSEO Backlinks Overview client — adapted from every-app/open-seo (MIT):
 * - src/server/lib/dataforseo/backlinks.ts
 *
 * https://github.com/every-app/open-seo
 */

const API_BASE = "https://api.dataforseo.com";
const SUMMARY_PATH = "/v3/backlinks/summary/live";
const REFERRING_DOMAINS_PATH = "/v3/backlinks/referring_domains/live";

export type BacklinksOverviewResult = {
  target: string;
  fetchedAt: string; // ISO
  configured: true;
  summary: {
    rank: number | null;
    backlinks: number | null;
    referringDomains: number | null;
    referringPages: number | null;
    brokenBacklinks: number | null;
    spamScore: number | null;
  };
  referringDomains: Array<{
    domain: string;
    backlinks: number | null;
    rank: number | null;
    firstSeen: string | null;
  }>;
  // ponytail: hardcoded estimate; upgrade when DataForSEO publishes exact per-call pricing
  costEstimateUsd: number;
};

function credentials(): { login: string; password: string } | null {
  const login = process.env["DATAFORSEO_LOGIN"]?.trim();
  const password = process.env["DATAFORSEO_PASSWORD"]?.trim();
  if (!login || !password) return null;
  return { login, password };
}

export function isBacklinksConfigured(): boolean {
  return credentials() !== null;
}

function authHeader(): string {
  const creds = credentials();
  if (!creds) {
    throw new Error("DataForSEO backlinks credentials are not configured");
  }
  return `Basic ${Buffer.from(`${creds.login}:${creds.password}`).toString("base64")}`;
}

/** Strip protocol and path; remove leading www. for consistency. */
function normalizeDomain(target: string): string {
  let host = target.trim();
  // Strip protocol
  host = host.replace(/^https?:\/\//i, "");
  // Strip path, query, fragment
  host = host.split(/[/?#]/)[0] ?? host;
  // Strip leading www.
  host = host.replace(/^www\./i, "");
  return host.toLowerCase();
}

type DfsTask = {
  status_code?: number;
  status_message?: string;
  result?: Array<Record<string, unknown>>;
};

type DfsResponse = {
  tasks?: DfsTask[];
};

async function dfsPost(path: string, body: unknown[]): Promise<DfsTask> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`DataForSEO HTTP ${response.status}`);
  }

  const data = (await response.json()) as DfsResponse;
  const task = data.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(task?.status_message ?? "DataForSEO task failed");
  }
  return task;
}

export async function fetchBacklinksOverview(input: {
  target: string;
  referringDomainsLimit?: number;
}): Promise<BacklinksOverviewResult> {
  if (!isBacklinksConfigured()) {
    throw new Error("DataForSEO backlinks credentials are not configured");
  }

  const target = normalizeDomain(input.target);
  const limit = Math.min(input.referringDomainsLimit ?? 10, 25);

  const commonFields = {
    target,
    include_subdomains: true,
    include_indirect_links: true,
    exclude_internal_backlinks: true,
    backlinks_status_type: "live",
    rank_scale: "one_hundred",
  };

  const summaryTask = await dfsPost(SUMMARY_PATH, [{ ...commonFields }]);
  const domainsTask = await dfsPost(REFERRING_DOMAINS_PATH, [
    {
      ...commonFields,
      limit,
      order_by: ["backlinks,desc"],
    },
  ]);

  const s = summaryTask.result?.[0] ?? {};
  const summary = {
    rank: (s["rank"] as number | null | undefined) ?? null,
    backlinks: (s["backlinks"] as number | null | undefined) ?? null,
    referringDomains:
      (s["referring_domains"] as number | null | undefined) ?? null,
    referringPages:
      (s["referring_pages"] as number | null | undefined) ?? null,
    brokenBacklinks:
      (s["broken_backlinks"] as number | null | undefined) ?? null,
    spamScore:
      (s["backlinks_spam_score"] as number | null | undefined) ??
      ((s["info"] as Record<string, unknown> | undefined)?.[
        "target_spam_score"
      ] as number | null | undefined) ??
      null,
  };

  const rawItems =
    (domainsTask.result?.[0]?.["items"] as Array<
      Record<string, unknown>
    > | null | undefined) ?? [];

  const referringDomains = rawItems.map((item) => ({
    domain: (item["domain"] as string | undefined) ?? "",
    backlinks: (item["backlinks"] as number | null | undefined) ?? null,
    rank: (item["rank"] as number | null | undefined) ?? null,
    firstSeen: (item["first_seen"] as string | null | undefined) ?? null,
  }));

  return {
    target,
    fetchedAt: new Date().toISOString(),
    configured: true,
    summary,
    referringDomains,
    costEstimateUsd: 0.02,
  };
}
