"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, ChevronLeft, Zap, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface ContentItem {
  id: number;
  day: number;
  format: string;
  title: string;
  topicAngle: string;
  primaryKeyword: string;
  status: string;
}

interface Strategy {
  id: number;
  industry: string;
  location: string;
  stage: string;
  month: number;
  year: number;
  items: ContentItem[];
}

export function AdminStrategyDetail({ strategyId, onBack }: { strategyId: number; onBack: () => void }) {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/content-strategies/${strategyId}`);
    if (!res.ok) { setStrategy(null); return; }
    setStrategy(await res.json());
  }, [strategyId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function toggleStatus(item: ContentItem) {
    const newStatus = item.status === "prepared" ? "draft" : "prepared";
    setBusyId(item.id);
    const res = await fetch(`/api/content-strategies/${strategyId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setBusyId(null);
    if (!res.ok) { toast.error("Failed to update item"); return; }
    await load();
  }

  async function generateItem(itemId: number, asyncMode: boolean) {
    setBusyId(itemId);
    const res = await fetch(`/api/content-strategies/${strategyId}/items/${itemId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ async: asyncMode }),
    });
    setBusyId(null);
    if (!res.ok) { toast.error("Generation failed"); return; }
    toast.success(asyncMode ? "Queued for generation" : "Generated");
    await load();
  }

  async function scheduleItem(itemId: number) {
    setBusyId(itemId);
    const res = await fetch(`/api/content-strategies/${strategyId}/items/${itemId}/schedule`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) { toast.error("Schedule failed"); return; }
    toast.success("Scheduled for generation + publish");
  }

  if (loading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;
  if (!strategy) return <p className="text-muted-foreground">Strategy not found.</p>;

  const items = [...(strategy.items ?? [])].sort((a, b) => a.day - b.day);
  const prepared = items.filter((i) => i.status === "prepared").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> All strategies
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">{prepared}/{items.length} prepared</span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              item.status === "prepared" ? "bg-emerald-500/5 border-emerald-500/30" : "border-border"
            }`}
          >
            <button
              type="button"
              className="shrink-0 mt-0.5"
              disabled={busyId === item.id}
              onClick={() => toggleStatus(item)}
              title={item.status === "prepared" ? "Mark draft" : "Mark prepared"}
            >
              {item.status === "prepared" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-mono text-muted-foreground">Day {item.day}</span>
                <Badge variant="muted">{item.format}</Badge>
                {item.status === "prepared" && <Badge variant="success">Prepared</Badge>}
              </div>
              <h4 className="font-medium text-sm">{item.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{item.topicAngle}</p>
              <p className="text-xs text-primary mt-1">{item.primaryKeyword}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => generateItem(item.id, false)}>
                <Zap className="h-3.5 w-3.5" /> Generate
              </Button>
              <Button size="sm" variant="ghost" disabled={busyId === item.id} onClick={() => generateItem(item.id, true)}>
                Queue
              </Button>
              <Button size="sm" variant="ghost" disabled={busyId === item.id} onClick={() => scheduleItem(item.id)}>
                <CalendarClock className="h-3.5 w-3.5" /> Schedule
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminStrategiesList({ onSelect }: { onSelect: (id: number) => void }) {
  const [strategies, setStrategies] = useState<Array<{ id: number; industry: string; location: string; stage: string; month: number; year: number; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content-strategies")
      .then((r) => r.json())
      .then(setStrategies)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-3">
      {strategies.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className="paper-card w-full text-left p-5 rounded-xl hover:bg-muted/30 transition-colors"
        >
          <p className="font-medium">{s.industry} · {s.location}</p>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{s.stage} · {s.month}/{s.year}</p>
        </button>
      ))}
      {strategies.length === 0 && <p className="text-center text-muted-foreground py-12">No strategies yet.</p>}
    </div>
  );
}
