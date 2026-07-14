"use client";

import { useRechartsModule } from "@/lib/use-recharts";

type TrendPoint = { date: string; score: number };
type CompetitorPoint = { name: string; count: number };

function ChartPlaceholder({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted/40 ${className ?? "h-full w-full"}`} />;
}

export function VisibilityTrendChart({ data }: { data: TrendPoint[] }) {
  const recharts = useRechartsModule();
  if (data.length <= 1) return null;
  if (!recharts) return <ChartPlaceholder className="h-full w-full" />;

  const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } = recharts;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompetitorMentionsChart({ data }: { data: CompetitorPoint[] }) {
  const recharts = useRechartsModule();
  if (data.length === 0) return null;
  if (!recharts) return <ChartPlaceholder className="h-full w-full" />;

  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } = recharts;

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
