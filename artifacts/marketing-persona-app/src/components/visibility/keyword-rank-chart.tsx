"use client";

import { useRechartsModule } from "@/lib/use-recharts";

interface Snapshot {
  checkedAt: string;
  position: number | null;
}

export function KeywordRankChart({ snapshots }: { snapshots: Snapshot[] }) {
  const recharts = useRechartsModule();
  const chartData = [...snapshots].reverse().map((s) => ({
    date: new Date(s.checkedAt).toLocaleDateString("en-US", { timeZone: "UTC" }),
    position: s.position ?? 100,
  }));

  if (chartData.length === 0) return null;
  if (!recharts) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted/40" />;
  }

  const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } = recharts;

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
