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
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} axisLine={false} tickLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={false} />
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
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
          <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip />
          <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
