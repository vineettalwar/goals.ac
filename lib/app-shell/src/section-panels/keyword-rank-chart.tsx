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
};

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
