import { MOCK_PROJECTS } from "./_ia";

export function MockPageCanvas({
  title,
  projectId,
}: {
  title: string;
  projectId: string;
}) {
  const project = MOCK_PROJECTS.find((p) => p.id === projectId) ?? MOCK_PROJECTS[0]!;
  return (
    <main className="min-w-0 flex-1 bg-background px-8 py-8">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {project.name} · mockup
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Local-state preview. Click sidebar items to change this heading. No product routes.
      </p>
      <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active view</p>
          <p className="mt-1 text-lg font-medium">{title}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Project</p>
          <p className="mt-1 text-lg font-medium">{project.name}</p>
        </div>
      </div>
    </main>
  );
}

export function ProjectSwitcher({
  projectId,
  onChange,
}: {
  projectId: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="block">
      <span className="sr-only">Project</span>
      <select
        value={projectId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm font-medium text-foreground"
      >
        {MOCK_PROJECTS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
