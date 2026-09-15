import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_ACTIVE_ID,
  FOOTER_ITEMS,
  NESTED_SECTIONS,
  itemOwnsActive,
  labelForActive,
  type MockNavItem,
} from "./_ia";
import { MockPageCanvas, ProjectSwitcher } from "./_preview-frame";

function initialExpanded(): Set<string> {
  const ids = new Set<string>();
  for (const section of NESTED_SECTIONS) {
    for (const item of section.items) {
      if (itemOwnsActive(item, DEFAULT_ACTIVE_ID)) ids.add(item.id);
    }
  }
  return ids;
}

function NavRow({
  item,
  activeId,
  expanded,
  onSelect,
  onToggle,
}: {
  item: MockNavItem;
  activeId: string;
  expanded: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const Icon = item.icon;
  const hasChildren = Boolean(item.children?.length);
  const parentActive = itemOwnsActive(item, activeId);

  return (
    <li>
      <button
        type="button"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-current={!hasChildren && item.id === activeId ? "page" : undefined}
        onClick={() => {
          if (hasChildren) {
            onToggle(item.id);
            if (!expanded) onSelect(item.children![0]!.id);
            return;
          }
          onSelect(item.id);
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
          parentActive
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", parentActive ? "text-primary" : "")} />
        {item.label}
      </button>
      {hasChildren && expanded ? (
        <ul className="mt-1 space-y-0.5">
          {item.children!.map((child) => {
            const ChildIcon = child.icon;
            const active = child.id === activeId;
            return (
              <li key={child.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => onSelect(child.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg py-1.5 pr-3 pl-9 text-left text-[13px] transition-colors",
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 truncate">{child.label}</span>
                  {child.badge ? (
                    <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {child.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

export function NestedSingleSidebar() {
  const [projectId, setProjectId] = useState("acme");
  const [activeId, setActiveId] = useState(DEFAULT_ACTIVE_ID);
  const [expanded, setExpanded] = useState(initialExpanded);

  const title = useMemo(() => labelForActive(activeId), [activeId]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="flex h-screen w-62 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
          <span className="text-sm font-semibold tracking-tight">goals.ac</span>
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            nested
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto px-2.5 py-4" aria-label="Product">
          <div className="mb-5 border-b border-border pb-4">
            <ProjectSwitcher projectId={projectId} onChange={setProjectId} />
          </div>
          {NESTED_SECTIONS.map((section) => (
            <div key={section.label} className="mb-5 last:mb-0">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <NavRow
                    key={item.id}
                    item={item}
                    activeId={activeId}
                    expanded={expanded.has(item.id)}
                    onSelect={setActiveId}
                    onToggle={toggle}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-border px-2.5 py-3">
          <ul className="space-y-1">
            {FOOTER_ITEMS.map((item) => (
              <NavRow
                key={item.id}
                item={item}
                activeId={activeId}
                expanded={false}
                onSelect={setActiveId}
                onToggle={toggle}
              />
            ))}
          </ul>
        </div>
      </aside>
      <MockPageCanvas title={title} projectId={projectId} />
    </div>
  );
}

export default NestedSingleSidebar;
