"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ActivityPoint, PipelineSlice } from "./dashboard-chart-data";

export {
  buildPipelineSlices,
  buildPublishActivitySeries,
  type ActivityPoint,
  type PipelineSlice,
} from "./dashboard-chart-data";

function readChartColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function useChartColors() {
  const [colors, setColors] = useState({
    primary: "#2D3B2D",
    muted: "#6B6560",
    grid: "#E8E5E0",
    series: ["#2D3B2D", "#047857", "#B45309", "#6B6560", "#C0392B"],
  });

  useEffect(() => {
    const sync = () => {
      setColors({
        primary: readChartColor("--chart-1", "#2D3B2D"),
        muted: readChartColor("--chart-4", "#6B6560"),
        grid: readChartColor("--chart-grid", "#E8E5E0"),
        series: [
          readChartColor("--chart-1", "#2D3B2D"),
          readChartColor("--chart-2", "#047857"),
          readChartColor("--chart-3", "#B45309"),
          readChartColor("--chart-4", "#6B6560"),
          readChartColor("--chart-5", "#C0392B"),
        ],
      });
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      {label ? <p className="mb-0.5 font-medium text-foreground">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.name} className="tabular-nums text-muted-foreground">
          {entry.name}: {entry.value ?? 0}
        </p>
      ))}
    </div>
  );
}

export function DashboardActivityChart({
  data,
  totalLabel,
}: {
  data: ActivityPoint[];
  totalLabel: string;
}) {
  const colors = useChartColors();
  const total = data.reduce((sum, point) => sum + point.publishes, 0);
  const hasSignal = total > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Publish activity</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{total}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{totalLabel}</p>
        </div>
      </div>
      {!hasSignal ? (
        <div className="flex min-h-45 flex-1 flex-col justify-center px-1 py-6">
          <p className="text-sm font-medium text-foreground">No publishes in recent history</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground text-pretty">
            Successful CMS publishes will plot here as they land.
          </p>
        </div>
      ) : (
        <div className="min-h-45 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="publishFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: colors.muted }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: colors.muted }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="publishes"
                name="Publishes"
                stroke={colors.primary}
                strokeWidth={2}
                fill="url(#publishFill)"
                dot={false}
                activeDot={{ r: 4, fill: colors.primary, stroke: "var(--card)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function DashboardPipelineDonut({ slices }: { slices: PipelineSlice[] }) {
  const colors = useChartColors();
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const themedSlices = slices.map((slice, index) => ({
    ...slice,
    color: colors.series[index % colors.series.length] ?? slice.color,
  }));

  if (total === 0) {
    return (
      <div className="flex h-full min-h-55 flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-foreground">No pipeline yet</p>
        <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground text-pretty">
          Drafts and publishes will show up here once content is in motion.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <p className="text-sm text-muted-foreground">Pipeline mix</p>
      <div className="relative mx-auto mt-2 h-40 w-full max-w-50">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={themedSlices}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
            >
              {themedSlices.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tabular-nums tracking-tight">{total}</p>
          <p className="text-[11px] text-muted-foreground">pieces</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {themedSlices.map((slice) => (
          <li key={slice.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              <span className="truncate text-muted-foreground">{slice.name}</span>
            </span>
            <span className="tabular-nums font-medium text-foreground">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
