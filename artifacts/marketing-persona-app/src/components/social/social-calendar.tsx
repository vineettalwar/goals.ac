"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { contentPiecePath } from "@/lib/projects/content-piece-path";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SocialCalendarItem = {
  id: number;
  title: string;
  platform: string | null;
  scheduledAt: string | null;
};

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function eachDayInMonth(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function SocialCalendar({
  projectId,
  items,
  loading,
  onRescheduled,
}: {
  projectId: string;
  items: SocialCalendarItem[];
  loading: boolean;
  onRescheduled: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [reschedulingId, setReschedulingId] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const unscheduled = useMemo(() => items.filter((i) => !i.scheduledAt), [items]);
  const byDate = useMemo(() => {
    const map: Record<string, SocialCalendarItem[]> = {};
    for (const item of items) {
      if (!item.scheduledAt) continue;
      const key = formatYmd(new Date(item.scheduledAt));
      map[key] = map[key] ?? [];
      map[key].push(item);
    }
    return map;
  }, [items]);

  async function reschedulePiece(pieceId: number, newDateKey: string | null) {
    const piece = items.find((i) => i.id === pieceId);
    setReschedulingId(pieceId);
    try {
      let scheduledAt: string | null = null;
      if (newDateKey && piece?.scheduledAt) {
        const prev = new Date(piece.scheduledAt);
        const [y, m, d] = newDateKey.split("-").map(Number);
        const next = new Date(prev);
        next.setFullYear(y!, m! - 1, d!);
        scheduledAt = next.toISOString();
      } else if (newDateKey) {
        const [y, m, d] = newDateKey.split("-").map(Number);
        const next = new Date();
        next.setFullYear(y!, m! - 1, d!);
        next.setHours(9, 0, 0, 0);
        scheduledAt = next.toISOString();
      }

      const res = await fetch(
        `/api/website-projects/${projectId}/social/queue/${pieceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAt }),
        },
      );
      if (!res.ok) throw new Error("Failed to reschedule");
      toast.success(scheduledAt ? "Rescheduled" : "Removed from calendar");
      onRescheduled();
    } catch {
      toast.error("Could not reschedule post");
    } finally {
      setReschedulingId(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const pieceId = Number(String(active.id).replace("piece-", ""));
    const newDate = String(over.id).replace("day-", "");
    if (newDate === "Unscheduled") {
      void reschedulePiece(pieceId, null);
      return;
    }
    void reschedulePiece(pieceId, newDate);
  }

  function handleDragStart(event: DragStartEvent) {
    const pieceId = Number(String(event.active.id).replace("piece-", ""));
    setActiveDragId(pieceId);
  }

  const days = eachDayInMonth(currentMonth);
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayKey = formatYmd(new Date());

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading calendar…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{monthLabel}</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          >
            ‹
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          >
            ›
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
          {weekDays.map((d) => (
            <div key={d} className="bg-muted/50 text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-background min-h-[88px]" />
          ))}
          {days.map((day) => {
            const key = formatYmd(day);
            const dayItems = byDate[key] ?? [];
            const isToday = key === todayKey;
            return (
              <CalendarDay key={key} dateKey={key}>
                <span
                  className={cn(
                    "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                    isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="space-y-0.5">
                  {dayItems.slice(0, 3).map((p) => (
                    <DraggablePost
                      key={p.id}
                      projectId={projectId}
                      item={p}
                      rescheduling={reschedulingId === p.id}
                    />
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">+{dayItems.length - 3} more</div>
                  )}
                </div>
              </CalendarDay>
            );
          })}
        </div>

        <CalendarDay dateKey="Unscheduled">
          <p className="text-xs font-medium text-muted-foreground mb-2">Unscheduled</p>
          <p className="text-[10px] text-muted-foreground mb-2">Drop here to unschedule</p>
          <div className="flex flex-wrap gap-1 min-h-[40px]">
            {unscheduled.map((p) => (
              <DraggablePost
                key={p.id}
                projectId={projectId}
                item={p}
                rescheduling={reschedulingId === p.id}
              />
            ))}
          </div>
        </CalendarDay>

        <DragOverlay>
          {activeDragId ? (
            <div className="paper-card rounded px-2 py-1 text-xs shadow-lg opacity-95 max-w-[140px] truncate">
              {items.find((p) => p.id === activeDragId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function CalendarDay({ dateKey, children }: { dateKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateKey}` });
  return (
    <div
      ref={setNodeRef}
      className={cn("bg-background min-h-[88px] p-1", isOver && "ring-1 ring-primary/30 bg-primary/5")}
    >
      {children}
    </div>
  );
}

function DraggablePost({
  projectId,
  item,
  rescheduling,
}: {
  projectId: string;
  item: SocialCalendarItem;
  rescheduling: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `piece-${item.id}` });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded border bg-card px-1.5 py-1 text-[10px] cursor-grab active:cursor-grabbing",
        rescheduling && "opacity-50",
      )}
    >
      <Link href={contentPiecePath(projectId, item.id)} className="font-medium truncate block hover:underline">
        {item.title}
      </Link>
      <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
        {item.platform && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{item.platform}</Badge>}
        {item.scheduledAt && <span>{formatTime(item.scheduledAt)}</span>}
      </div>
    </div>
  );
}
