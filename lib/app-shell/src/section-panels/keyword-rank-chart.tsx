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
};

export function parseSerpFeatures(raw?: Record<string, unknown> | null): SerpFeatureSummary | null {
  if (!raw || Object.keys(raw).length === 0) return null;
  const peopleAlsoAsk = Array.isArray(raw.peopleAlsoAsk)
    ? raw.peopleAlsoAsk.filter((item): item is string => typeof item === "string")
    : [];
  const topResults = Array.isArray(raw.topResults)
    ? (raw.topResults as Array<{ url?: string; title?: string }>)
    : [];
  return {
    featuredSnippet: Boolean(raw.featuredSnippet),
    peopleAlsoAsk,
    organicCount: typeof raw.organicCount === "number" ? raw.organicCount : 0,
    topResults: topResults.slice(0, 3),
  };
}

export function SerpFeaturesPanel({ features }: { features: SerpFeatureSummary | null }) {
  if (!features) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
      <p className="font-medium text-foreground">SERP snapshot</p>
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
