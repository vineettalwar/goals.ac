import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type SensorDescriptor,
  type SensorOptions,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "../cn";
import { eachDayInMonth, formatYmd, WEEK_DAY_LABELS } from "./studio-hub-utils";
import { formatTypeLabel, type StudioPiece } from "./types";

function CalendarDay({
  dateKey,
  children,
  className,
}: {
  dateKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateKey}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[88px] bg-background p-1.5",
        isOver && "bg-primary/5 ring-1 ring-primary/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CalendarDraggablePiece({
  piece,
  isRescheduling,
}: {
  piece: StudioPiece;
  isRescheduling: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `piece-${piece.id}` });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const label = formatTypeLabel(piece.formatType);
  const title = piece.title ?? "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] leading-tight",
        isRescheduling && "opacity-50",
      )}
      title={title}
    >
      {label}: {title.slice(0, 20)}
    </div>
  );
}

export function StudioCalendarView({
  pieces,
  reschedulingId = null,
  sensors,
  onDragStart,
  onDragEnd,
  activeDragId = null,
}: {
  pieces: StudioPiece[];
  reschedulingId?: number | null;
  sensors: SensorDescriptor<SensorOptions>[];
  onDragStart: (pieceId: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
  activeDragId?: number | null;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const days = useMemo(() => eachDayInMonth(currentMonth), [currentMonth]);
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthLabel = currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayKey = formatYmd(new Date());

  const unscheduledPieces = pieces.filter((piece) => !piece.plannedDate);
  const piecesByDate = useMemo(() => {
    const map: Record<string, StudioPiece[]> = {};
    for (const piece of pieces) {
      if (!piece.plannedDate) continue;
      map[piece.plannedDate] = map[piece.plannedDate] ?? [];
      map[piece.plannedDate].push(piece);
    }
    return map;
  }, [pieces]);

  function handleDragStart(event: DragStartEvent) {
    const pieceId = Number(String(event.active.id).replace("piece-", ""));
    onDragStart(pieceId);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{monthLabel}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-card text-sm hover:bg-secondary"
            onClick={() =>
              setCurrentMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))
            }
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-card text-sm hover:bg-secondary"
            onClick={() =>
              setCurrentMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))
            }
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      {pieces.length === 0 ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Create content pieces and drag them between days to reschedule.
        </p>
      ) : null}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={onDragEnd}>
        {/* Mobile agenda — day cells are too narrow under md */}
        <div className="space-y-3 md:hidden">
          {days.map((day) => {
            const key = formatYmd(day);
            const dayPieces = piecesByDate[key] ?? [];
            if (dayPieces.length === 0) return null;
            const isToday = key === todayKey;
            return (
              <div
                key={`agenda-${key}`}
                className="rounded-lg border border-border bg-card p-3"
              >
                <CalendarDay dateKey={key} className="min-h-0 bg-transparent p-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                        isToday ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                      )}
                    >
                      {day.getDate()}
                    </span>
                    <span className="text-sm font-medium">
                      {day.toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayPieces.map((piece) => (
                      <CalendarDraggablePiece
                        key={piece.id}
                        piece={piece}
                        isRescheduling={reschedulingId === piece.id}
                      />
                    ))}
                  </div>
                </CalendarDay>
              </div>
            );
          })}
          {Object.keys(piecesByDate).length === 0 && pieces.length > 0 ? (
            <p className="text-sm text-muted-foreground">No pieces scheduled this month.</p>
          ) : null}
        </div>

        <div className="hidden overflow-hidden rounded-lg border md:block">
          <div className="grid grid-cols-7 gap-px bg-border">
            {WEEK_DAY_LABELS.map((label) => (
              <div
                key={label}
                className="bg-muted/50 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[88px] bg-background" />
            ))}
            {days.map((day) => {
              const key = formatYmd(day);
              const dayPieces = piecesByDate[key] ?? [];
              const isToday = key === todayKey;
              return (
                <CalendarDay key={key} dateKey={key}>
                  <span
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="space-y-0.5">
                    {dayPieces.slice(0, 3).map((piece) => (
                      <CalendarDraggablePiece
                        key={piece.id}
                        piece={piece}
                        isRescheduling={reschedulingId === piece.id}
                      />
                    ))}
                    {dayPieces.length > 3 ? (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        +{dayPieces.length - 3} more
                      </p>
                    ) : null}
                  </div>
                </CalendarDay>
              );
            })}
          </div>
        </div>

        <CalendarDay dateKey="Unscheduled">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Unscheduled</p>
          <p className="mb-2 text-[10px] text-muted-foreground">Drop here to remove from calendar</p>
          <div className="flex min-h-[40px] flex-wrap gap-1">
            {unscheduledPieces.map((piece) => (
              <CalendarDraggablePiece
                key={piece.id}
                piece={piece}
                isRescheduling={reschedulingId === piece.id}
              />
            ))}
            {unscheduledPieces.length === 0 ? (
              <span className="text-[10px] italic text-muted-foreground">No unscheduled pieces</span>
            ) : null}
          </div>
        </CalendarDay>

        <DragOverlay>
          {activeDragId ? (
            <div className="paper-card max-w-[140px] truncate rounded px-2 py-1 text-xs opacity-95 shadow-lg">
              {pieces.find((piece) => piece.id === activeDragId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
