"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { FORMAT_OPTIONS } from "@/lib/content/content-format-options";
import { cn } from "@/lib/utils";
import { WEEK_DAY_LABELS, eachDayInMonth, formatYmd, type StudioPiece } from "./content-studio-utils";

export function MonthCalendar({
  pieces,
  reschedulingId,
  sensors,
  onDragStart,
  onDragEnd,
  activeDragId,
}: {
  pieces: StudioPiece[];
  reschedulingId: number | null;
  sensors: ReturnType<typeof useSensors>;
  onDragStart: (id: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeDragId: number | null;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const days = eachDayInMonth(currentMonth);
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const unscheduledPieces = pieces.filter((p) => !p.plannedDate);
  const piecesByDate: Record<string, StudioPiece[]> = {};
  for (const piece of pieces) {
    if (!piece.plannedDate) continue;
    piecesByDate[piece.plannedDate] = piecesByDate[piece.plannedDate] ?? [];
    piecesByDate[piece.plannedDate].push(piece);
  }

  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const todayKey = formatYmd(new Date());

  function handleStart(event: DragStartEvent) {
    const pieceId = Number(String(event.active.id).replace("piece-", ""));
    onDragStart(pieceId);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{monthLabel}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</Button>
        </div>
      </div>

      {pieces.length === 0 && (
        <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 border">
          Create content pieces and drag them between days to reschedule.
        </p>
      )}

      <DndContext sensors={sensors} onDragStart={handleStart} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
          {WEEK_DAY_LABELS.map((d) => (
            <div key={d} className="bg-muted/50 text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-background min-h-[80px]" />
          ))}
          {days.map((day) => {
            const key = formatYmd(day);
            const dayPieces = piecesByDate[key] ?? [];
            const isToday = key === todayKey;
            return (
              <CalendarDay key={key} dateKey={key}>
                <span className={cn(
                  "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}>
                  {day.getDate()}
                </span>
                <div className="space-y-0.5">
                  {dayPieces.slice(0, 2).map((p) => (
                    <CalendarDraggablePiece key={p.id} piece={p} isRescheduling={reschedulingId === p.id} />
                  ))}
                  {dayPieces.length > 2 && (
                    <div className="text-xs text-muted-foreground px-1">+{dayPieces.length - 2} more</div>
                  )}
                </div>
              </CalendarDay>
            );
          })}
        </div>

        <CalendarDay dateKey="Unscheduled">
          <p className="text-xs font-medium text-muted-foreground mb-2">Unscheduled</p>
          <p className="text-[10px] text-muted-foreground mb-2">Drop here to remove from the calendar</p>
          <div className="flex flex-wrap gap-1 min-h-[40px]">
            {unscheduledPieces.map((p) => (
              <CalendarDraggablePiece key={p.id} piece={p} isRescheduling={reschedulingId === p.id} />
            ))}
            {unscheduledPieces.length === 0 && (
              <span className="text-[10px] text-muted-foreground italic">No unscheduled pieces</span>
            )}
          </div>
        </CalendarDay>

        <DragOverlay>
          {activeDragId ? (
            <div className="paper-card rounded px-2 py-1 text-xs shadow-lg opacity-95 max-w-[120px] truncate">
              {pieces.find((p) => p.id === activeDragId)?.title}
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
    <div ref={setNodeRef} className={cn("bg-background min-h-[80px] p-1", isOver && "ring-1 ring-primary/30 bg-primary/5")}>
      {children}
    </div>
  );
}

function CalendarDraggablePiece({ piece, isRescheduling }: { piece: StudioPiece; isRescheduling: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `piece-${piece.id}` });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const label = FORMAT_OPTIONS.find((o) => o.value === piece.formatType)?.label ?? piece.formatType;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn("cursor-grab rounded px-1 py-0.5 text-[10px] bg-primary/10 truncate", isRescheduling && "opacity-50")}>
      {label}: {piece.title.slice(0, 20)}
    </div>
  );
}
