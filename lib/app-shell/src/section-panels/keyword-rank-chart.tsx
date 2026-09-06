import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type KeywordRankSnapshot = {
  checkedAt: string;
  position: number | null;
  serpFeatures?: Record<string, unknown>;
};

export type SerpFeatureSummary = {
  featuredSnippet: boolean;
  peopleAlsoAsk: string[];
  organicCount: number;
  topResults: Array<{ url?: string; title?: string }>;
  featureTypes: string[];
  aiOverview: boolean;
  localPack: boolean;
  knowledgeGraph: boolean;
};

export function parseSerpFeatures(raw?: Record<string, unknown> | null): SerpFeatureSummary | null {
  if (!raw || Object.keys(raw).length === 0) return null;
  const peopleAlsoAsk = Array.isArray(raw.peopleAlsoAsk)
    ? raw.peopleAlsoAsk.filter((item): item is string => typeof item === "string")
    : [];
  const topResults = Array.isArray(raw.topResults)
    ? (raw.topResults as Array<{ url?: string; title?: string }>)
    : [];
  const featureTypes = Array.isArray(raw.featureTypes)
    ? raw.featureTypes.filter((t): t is string => typeof t === "string")
    : [];
  return {
    featuredSnippet: Boolean(raw.featuredSnippet),
    peopleAlsoAsk,
    organicCount: typeof raw.organicCount === "number" ? raw.organicCount : 0,
    topResults: topResults.slice(0, 3),
    featureTypes,
    aiOverview: Boolean(raw.aiOverview),
    localPack: Boolean(raw.localPack),
    knowledgeGraph: Boolean(raw.knowledgeGraph),
  };
}

const SERP_CHIP =
  "inline-block rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] leading-tight text-muted-foreground";

export function SerpFeaturesPanel({ features }: { features: SerpFeatureSummary | null }) {
  if (!features) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
      <p className="font-medium text-foreground">SERP snapshot</p>
      {/* Feature-type chips */}
      {(features.aiOverview || features.localPack || features.knowledgeGraph || features.featureTypes.length > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {features.aiOverview && <span className={SERP_CHIP}>AI Overview</span>}
          {features.localPack && <span className={SERP_CHIP}>Local Pack</span>}
          {features.knowledgeGraph && <span className={SERP_CHIP}>Knowledge Graph</span>}
          {features.featuredSnippet && <span className={SERP_CHIP}>Featured Snippet</span>}
          {features.featureTypes
            .filter((t) => !["organic", "ai_overview", "local_pack", "knowledge_graph", "featured_snippet", "people_also_ask"].includes(t))
            .slice(0, 6)
            .map((t) => (
              <span key={t} className={SERP_CHIP}>{t.replace(/_/g, " ")}</span>
            ))}
        </div>
      )}
      <ul className="mt-2 space-y-1 text-muted-foreground">
        <li>{features.featuredSnippet ? "Featured snippet present" : "No featured snippet"}</li>
        <li>{features.organicCount > 0 ? `${features.organicCount} organic results tracked` : "Organic depth unknown"}</li>
        {features.peopleAlsoAsk.length > 0 ? (
          <li>People also ask: {features.peopleAlsoAsk.slice(0, 2).join(" · ")}</li>
        ) : null}
        {features.topResults[0]?.title ? (
          <li className="truncate">#1: {features.topResults[0].title}</li>
        ) : null}
      </ul>
    </div>
  );
}

export function KeywordRankChart({ snapshots }: { snapshots: KeywordRankSnapshot[] }) {
  const chartData = [...snapshots].reverse().map((snapshot) => ({
    date: new Date(snapshot.checkedAt).toLocaleDateString("en-US", { timeZone: "UTC" }),
    position: snapshot.position ?? 100,
  }));

  if (chartData.length === 0) return null;

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis reversed domain={[1, 100]} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Line type="monotone" dataKey="position" stroke="hsl(var(--primary))" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
