import { useAuth } from "@/context/auth";

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="rounded-xl border border-[var(--border)] bg-white p-6 space-y-3 text-sm">
        <Row label="Email" value={user?.email ?? "—"} />
        <Row label="Name" value={user?.name ?? "—"} />
        <Row label="Role" value={user?.role ?? "—"} />
        <Row label="API origin" value={import.meta.env.VITE_API_URL ?? "https://api.goals.ac"} />
      </div>
      <p className="text-xs text-[var(--muted)] mt-4">
        Full settings (AI keys, integrations) remain in the Next.js app until all routes are ported
        to the edge gateway.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--border)] pb-2 last:border-0">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  );
}
