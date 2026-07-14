import { useRechartsModule } from "@/lib/use-recharts";

type ChartPoint = { date: string; position: number };

export function KeywordRankChart({ data }: { data: ChartPoint[] }) {
  const recharts = useRechartsModule();
  if (data.length === 0) return null;
  if (!recharts) {
    return <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />;
  }

  const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } = recharts;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis reversed domain={[1, 101]} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => (v > 100 ? "Not ranked" : `#${v}`)} />
        <Line type="monotone" dataKey="position" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
