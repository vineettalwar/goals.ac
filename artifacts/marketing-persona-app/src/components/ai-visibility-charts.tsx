"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

type TrendPoint = { date: string; score: number };
type CompetitorPoint = { name: string; count: number };

export function VisibilityTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length <= 1) return null;

  return (
    <div className="paper-card p-6">
      <h2 className="font-semibold mb-4">Visibility over time</h2>
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
    </div>
  );
}

export function CompetitorMentionsChart({ data }: { data: CompetitorPoint[] }) {
  if (data.length === 0) return null;

  return (
    <div className="paper-card p-6">
      <h2 className="font-semibold">Competitor mentions in AI answers</h2>
      <p className="text-sm text-muted-foreground mb-4">
        How often competitors appear when your brand does not
      </p>
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
    </div>
  );
}
