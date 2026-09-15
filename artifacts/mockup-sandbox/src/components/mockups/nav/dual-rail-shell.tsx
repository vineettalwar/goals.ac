import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_ACTIVE_ID,
  MOCK_PROJECTS,
  RAIL_AREAS,
  firstLeafId,
  labelForActive,
  railAreaForActive,
  type MockNavChild,
} from "./_ia";
import { MockPageCanvas } from "./_preview-frame";

export function DualRailShell() {
  const [projectId, setProjectId] = useState("nike");
  const [activeId, setActiveId] = useState(DEFAULT_ACTIVE_ID);
  const area = railAreaForActive(activeId);
  const project = MOCK_PROJECTS.find((p) => p.id === projectId) ?? MOCK_PROJECTS[0]!;

  const title = useMemo(() => labelForActive(activeId), [activeId]);

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="flex h-screen shrink-0" aria-label="Product navigation">
        <div className="flex w-14 flex-col items-center border-r border-sidebar-border bg-sidebar py-3">
          <span className="mb-4 text-[10px] font-semibold tracking-tight text-foreground">g</span>
          <div className="flex flex-1 flex-col gap-1">
            {RAIL_AREAS.map((rail) => {
              const Icon = rail.icon;
              const selected = rail.id === area.id;
              return (
                <button
                  key={rail.id}
                  type="button"
                  title={rail.label}
                  aria-current={selected ? "true" : undefined}
                  aria-label={rail.label}
                  onClick={() => setActiveId(firstLeafId(rail))}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                    selected
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="border-b border-border px-4 py-4">
            <label className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                {project.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="block w-full bg-transparent text-sm font-semibold text-foreground"
                >
                  {MOCK_PROJECTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="block text-xs text-muted-foreground">{project.subtitle}</span>
              </span>
            </label>
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label={area.label}>
            {area.groups.map((group) => {
              const groupActive = group.children.some((c) => c.id === activeId);
              return (
                <div key={group.id} className="mb-4">
                  <p
                    className={cn(
                      "mb-1 rounded-xl px-3 py-2 text-sm",
                      groupActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "px-3 font-medium text-foreground",
                    )}
                  >
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.children.map((child: MockNavChild) => {
                      const Icon = child.icon;
                      const active = child.id === activeId;
                      return (
                        <li key={child.id}>
                          <button
                            type="button"
                            aria-current={active ? "page" : undefined}
                            onClick={() => setActiveId(child.id)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors",
                              active
                                ? "font-medium text-foreground"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="min-w-0 truncate">{child.label}</span>
                            {child.badge ? (
                              <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                                {child.badge}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
      <MockPageCanvas title={title} projectId={projectId} />
    </div>
  );
}

export default DualRailShell;
