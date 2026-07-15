import {
  findRankingPosition,
  type RankCheckParams,
  type RankCheckResult,
  type SerpProvider,
} from "./types";

type DataForSeoOrganicItem = {
  type?: string;
  rank_absolute?: number;
  url?: string;
  title?: string;
  items?: Array<{ title?: string; question?: string }>;
};

type DataForSeoTaskResult = {
  items?: DataForSeoOrganicItem[];
};

type DataForSeoResponse = {
  tasks?: Array<{
    status_code?: number;
    status_message?: string;
    result?: DataForSeoTaskResult[];
  }>;
};

export class DataForSeoProvider implements SerpProvider {
  readonly id = "dataforseo";

  private login: string | undefined;
  private password: string | undefined;

  constructor() {
    this.login = process.env["DATAFORSEO_LOGIN"]?.trim();
    this.password = process.env["DATAFORSEO_PASSWORD"]?.trim();
  }

  isConfigured(): boolean {
    return Boolean(this.login && this.password);
  }

  async checkRank(params: RankCheckParams): Promise<RankCheckResult> {
    if (!this.isConfigured()) {
      throw new Error("DataForSEO credentials are not configured");
    }

    const {
      keyword,
      targetUrl,
      location = "United States",
      language = "en",
      device = "desktop",
    } = params;

    const auth = Buffer.from(`${this.login}:${this.password}`).toString("base64");
    const response = await fetch(
      "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            keyword,
            location_name: location,
            language_code: language,
            device,
            depth: 100,
          },
        ]),
      },
    );

    if (!response.ok) {
      throw new Error(`DataForSEO HTTP ${response.status}`);
    }

    const data = (await response.json()) as DataForSeoResponse;
    const task = data.tasks?.[0];
    if (!task || task.status_code !== 20000) {
      throw new Error(task?.status_message ?? "DataForSEO task failed");
    }

    const items = task.result?.[0]?.items ?? [];
    const organic = items
      .filter((item) => item.type === "organic" && typeof item.rank_absolute === "number" && item.url)
      .map((item) => ({
        position: item.rank_absolute as number,
        url: item.url as string,
        title: item.title,
      }));

    const peopleAlsoAsk: string[] = [];
    for (const item of items) {
      if (item.type !== "people_also_ask") continue;
      for (const nested of item.items ?? []) {
        const question = nested.title ?? nested.question;
        if (question && peopleAlsoAsk.length < 5) peopleAlsoAsk.push(question);
      }
    }

    const serpFeatures: Record<string, unknown> = {
      organicCount: organic.length,
      featuredSnippet: items.some((item) => item.type === "featured_snippet"),
      peopleAlsoAsk,
      topResults: organic.slice(0, 5).map((item) => ({
        position: item.position,
        url: item.url,
        title: item.title,
      })),
    };

    const { position, rankingUrl } = findRankingPosition(organic, targetUrl);

    return {
      position,
      rankingUrl,
      serpFeatures,
      provider: this.id,
    };
  }
}

export function getSerpProvider(): SerpProvider {
  const provider = process.env["SERP_PROVIDER"]?.trim() ?? "dataforseo";
  if (provider === "dataforseo") {
    return new DataForSeoProvider();
  }
  throw new Error(`Unknown SERP provider: ${provider}`);
}

export function isSerpConfigured(): boolean {
  return getSerpProvider().isConfigured();
}
