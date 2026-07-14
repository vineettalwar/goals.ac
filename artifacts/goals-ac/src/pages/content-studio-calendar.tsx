import { Link } from "react-router-dom";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, parseISO } from "date-fns";
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CALENDAR_WEEK_DAYS, type ContentPiece } from "./content-studio-types";
import { FORMAT_META } from "./content-studio-types";
import { FormatBadge, StatusBadge } from "./content-studio-format-badge";
import { FORMAT_META } from "./content-studio-types";
import { FORMAT_CATEGORIES, CALENDAR_WEEK_DAYS, extractSections } from "./content-studio-types";

export function PieceChip({ piece, faded }: { piece: ContentPiece; faded?: boolean }) {
  const meta = FORMAT_META[piece.formatType];
  return (
    <div
      className={`text-xs px-1.5 py-0.5 rounded truncate ${meta.color} transition-opacity cursor-grab active:cursor-grabbing ${faded ? "opacity-30" : "hover:opacity-80"}`}
      title={piece.title}
    >
      {piece.title}
    </div>
  );
}

function DraggablePiece({
  piece,
  isRescheduling,
}: {
  piece: ContentPiece;
  isRescheduling?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `piece-${piece.id}`,
      data: { piece },
    });

  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-30" : undefined}
    >
      <Link
        to={`/content-piece/${piece.id}`}
        onClick={(e) => isDragging && e.preventDefault()}
      >
        <PieceChip piece={piece} faded={isRescheduling && !isDragging} />
      </Link>
    </div>
  );
}

function DroppableDay({
  dateKey,
  children,
}: {
  dateKey: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dateKey}`,
    data: { dateKey },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] p-1.5 transition-colors ${isOver ? "bg-primary/10 ring-1 ring-primary/30 rounded" : ""}`}
    >
      {children}
    </div>
  );
}

function ContentCalendar({
  pieces,
  reschedulingId,
  onReschedule,
}: {
  pieces: ContentPiece[];
  reschedulingId: number | null;
  onReschedule: (pieceId: number, newDate: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activePiece, setActivePiece] = useState<ContentPiece | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const firstDayOfWeek = getDay(startOfMonth(currentMonth));

  const piecesByDate: Record<string, ContentPiece[]> = {};
  for (const piece of pieces) {
    const dateKey = piece.plannedDate ?? piece.createdAt.split("T")[0];
    if (!piecesByDate[dateKey]) piecesByDate[dateKey] = [];
    piecesByDate[dateKey].push(piece);
  }

  const handleDragStart = (event: DragStartEvent) => {
    const pieceId = Number((event.active.id as string).replace("piece-", ""));
    setActivePiece(pieces.find((p) => p.id === pieceId) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActivePiece(null);
    if (!over) return;

    const pieceId = Number((active.id as string).replace("piece-", ""));
    const newDateKey = (over.id as string).replace("day-", "");

    const piece = pieces.find((p) => p.id === pieceId);
    if (!piece) return;
    const currentDate = piece.plannedDate ?? piece.createdAt.split("T")[0];
    if (currentDate === newDateKey) return;

    onReschedule(pieceId, newDateKey);
  };

  const prevMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            ‹
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            ›
          </Button>
        </div>
      </div>

      {pieces.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-3 border border-border/50">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>
            Create content pieces and they'll appear here. Drag them between
            days to reschedule.
          </span>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {CALENDAR_WEEK_DAYS.map((d) => (
            <div
              key={d}
              className="bg-muted/50 text-center text-xs font-medium text-muted-foreground py-2"
            >
              {d}
            </div>
          ))}

          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-background min-h-[80px]" />
          ))}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayPieces = piecesByDate[key] ?? [];
            const isToday = key === format(new Date(), "yyyy-MM-dd");
            return (
              <div key={key} className="bg-background">
                <DroppableDay dateKey={key}>
                  <span
                    className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5">
                    {dayPieces.slice(0, 2).map((p) => (
                      <DraggablePiece
                        key={p.id}
                        piece={p}
                        isRescheduling={reschedulingId === p.id}
                      />
                    ))}
                    {dayPieces.length > 2 && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayPieces.length - 2} more
                      </div>
                    )}
                  </div>
                </DroppableDay>
              </div>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activePiece ? (
            <div className="pointer-events-none rotate-1 shadow-xl opacity-95">
              <PieceChip piece={activePiece} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
