import { useMemo, useState, type ReactNode } from "react";
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
import { Loader2 } from "lucide-react";
import { cn } from "../cn";
import {
  getSocialPlatformLimit,
  isSocialOverCharLimit,
  resolveSocialPlatformId,
  socialPostCharCount,
  WEEK_DAY_LABELS,
  type SocialPlatformId,
  type SocialQueueItem,
} from "./types";
import type { SocialHubLinkProps } from "./social-queue-panel";

export type SocialCalendarItem = Pick<
  SocialQueueItem,
  "id" | "title" | "platform" | "scheduledAt" | "bodyMarkdown" | "formatType"
>;

/** Subtle Buffer-style platform accents for calendar cards. */
function platformCardClass(platformId: SocialPlatformId | null): string {
  if (platformId === "linkedin") {
    return "border-l-[3px] border-l-[#0A66C2] border-y border-r border-y-border border-r-border";
  }
  if (platformId === "twitter") {
    return "border-l-[3px] border-l-neutral-900 border-y border-r border-y-border border-r-border dark:border-l-neutral-100";
  }
  if (platformId === "instagram") {
    return "border border-transparent [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(135deg,#f09433_0%,#e6683c_25%,#dc2743_50%,#cc2366_75%,#bc1888_100%)_border-box]";
  }
  return "border border-border";
}

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
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function SocialCalendarPanel({
  items,
  loading,
  reschedulingId,
  pieceHref,
  renderLink,
  onReschedule,
}: {
  items: SocialCalendarItem[];
  loading: boolean;
  reschedulingId: number | null;
  pieceHref: (pieceId: number) => string;
  renderLink: (props: SocialHubLinkProps) => ReactNode;
  onReschedule: (pieceId: number, newDateKey: string | null) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const unscheduled = useMemo(() => items.filter((item) => !item.scheduledAt), [items]);
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

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const pieceId = Number(String(active.id).replace("piece-", ""));
    const newDate = String(over.id).replace("day-", "");
    if (newDate === "Unscheduled") {
      onReschedule(pieceId, null);
      return;
    }
    onReschedule(pieceId, newDate);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(Number(String(event.active.id).replace("piece-", "")));
  }

  const days = eachDayInMonth(currentMonth);
  const firstDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const todayKey = formatYmd(new Date());

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading calendar…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{monthLabel}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input text-sm hover:bg-muted/50"
            onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input text-sm hover:bg-muted/50"
            onClick={() => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-3 md:hidden">
          {days.map((day) => {
            const key = formatYmd(day);
            const dayItems = byDate[key] ?? [];
            if (dayItems.length === 0) return null;
            const isToday = key === todayKey;
            return (
              <div key={`agenda-${key}`} className="rounded-lg border border-border bg-card p-3">
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
                      {day.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayItems.map((item) => (
                      <DraggablePost
                        key={item.id}
                        item={item}
                        rescheduling={reschedulingId === item.id}
                        pieceHref={pieceHref}
                        renderLink={renderLink}
                      />
                    ))}
                  </div>
                </CalendarDay>
              </div>
            );
          })}
          {Object.keys(byDate).length === 0 && items.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing on the calendar this month. Drag a post onto a day to schedule it.
            </p>
          ) : null}
        </div>

        <div className="hidden overflow-hidden rounded-lg border border-border md:block">
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
              const dayItems = byDate[key] ?? [];
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
                    {dayItems.slice(0, 3).map((item) => (
                      <DraggablePost
                        key={item.id}
                        item={item}
                        rescheduling={reschedulingId === item.id}
                        pieceHref={pieceHref}
                        renderLink={renderLink}
                      />
                    ))}
                    {dayItems.length > 3 ? (
                      <div className="px-1 text-[10px] text-muted-foreground">
                        +{dayItems.length - 3} more
                      </div>
                    ) : null}
                    {dayItems.length === 0 ? (
                      <p className="px-0.5 pt-1 text-[9px] leading-tight text-muted-foreground/45">
                        Drop to schedule
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
          <p className="mb-2 text-[10px] text-muted-foreground">Drop here to unschedule</p>
          <div className="flex min-h-[40px] flex-wrap gap-1">
            {unscheduled.map((item) => (
              <DraggablePost
                key={item.id}
                item={item}
                rescheduling={reschedulingId === item.id}
                pieceHref={pieceHref}
                renderLink={renderLink}
              />
            ))}
          </div>
        </CalendarDay>

        <DragOverlay>
          {activeDragId ? (
            <div className="paper-card max-w-[140px] truncate rounded px-2 py-1 text-xs opacity-95 shadow-lg">
              {items.find((item) => item.id === activeDragId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function CalendarDay({
  dateKey,
  children,
  className,
}: {
  dateKey: string;
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateKey}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[88px] bg-background p-1",
        isOver && "bg-primary/5 ring-1 ring-primary/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

function DraggablePost({
  item,
  rescheduling,
  pieceHref,
  renderLink,
}: {
  item: SocialCalendarItem;
  rescheduling: boolean;
  pieceHref: (pieceId: number) => string;
  renderLink: (props: SocialHubLinkProps) => ReactNode;
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
        "cursor-grab rounded border border-border bg-card px-1.5 py-1 text-[10px] active:cursor-grabbing",
        rescheduling && "opacity-50",
      )}
    >
      {renderLink({
        href: pieceHref(item.id),
        className: "block truncate font-medium hover:underline",
        children: item.title,
      })}
      <div className="mt-0.5 flex items-center gap-1 text-muted-foreground">
        {item.platform ? (
          <span className="inline-flex h-4 items-center rounded border border-border px-1 text-[9px]">
            {item.platform}
          </span>
        ) : null}
        {item.scheduledAt ? <span>{formatTime(item.scheduledAt)}</span> : null}
      </div>
    </div>
  );
}
