import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type OrgSecuritySettings = {
  allowCrossProjectEditors?: boolean;
  requireMfa?: boolean;
  allowedIps?: string[];
};

async function fetchOrgSecuritySettings(): Promise<{ securitySettings: OrgSecuritySettings }> {
  return apiFetch<{ securitySettings: OrgSecuritySettings }>("/api/organizations/security");
}

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
        checked ? "border-primary bg-primary" : "border-border bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-background shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function OrgSecurityPanel({ canManage }: { canManage: boolean }) {
  const { data } = useQuery({
    queryKey: ["org-security-settings"],
    queryFn: fetchOrgSecuritySettings,
    enabled: canManage,
  });

  const [allowedIps, setAllowedIps] = useState("");
  const [allowCrossProjectEditors, setAllowCrossProjectEditors] = useState(false);
  const [requireMfa, setRequireMfa] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.securitySettings) return;
    setAllowCrossProjectEditors(Boolean(data.securitySettings.allowCrossProjectEditors));
    setRequireMfa(Boolean(data.securitySettings.requireMfa));
    const ips = data.securitySettings.allowedIps;
    if (Array.isArray(ips)) setAllowedIps(ips.join("\n"));
  }, [data]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch("/api/organizations/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allowCrossProjectEditors,
          requireMfa,
          allowedIps: allowedIps
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        }),
      });
      setMessage("Security settings updated");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save security settings");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) return null;

  return (
    <div className="paper-card space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold">Organization security</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          IP allowlist and cross-project editor access for your org.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <label htmlFor="cross-project" className="text-sm">
          Editors can access all projects
        </label>
        <Toggle id="cross-project" checked={allowCrossProjectEditors} onChange={setAllowCrossProjectEditors} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <label htmlFor="require-mfa" className="text-sm">
            Require two-factor authentication
          </label>
          <p className="text-xs text-muted-foreground">Members must enable TOTP before accessing the app.</p>
        </div>
        <Toggle id="require-mfa" checked={requireMfa} onChange={setRequireMfa} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="allowed-ips" className="text-sm font-medium">
          IP allowlist (one per line)
        </label>
        <textarea
          id="allowed-ips"
          value={allowedIps}
          onChange={(event) => setAllowedIps(event.target.value)}
          placeholder="203.0.113.10"
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save security settings"}
      </button>
    </div>
  );
}
