"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOrgSecuritySettings } from "@/lib/queries";

export function OrgSecurityPanel({ canManage }: { canManage: boolean }) {
  const { data } = useOrgSecuritySettings(canManage);
  const [allowedIps, setAllowedIps] = useState("");
  const [allowCrossProjectEditors, setAllowCrossProjectEditors] = useState(false);
  const [requireMfa, setRequireMfa] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data?.securitySettings) return;
    setAllowCrossProjectEditors(Boolean(data.securitySettings.allowCrossProjectEditors));
    setRequireMfa(Boolean(data.securitySettings.requireMfa));
    const ips = data.securitySettings.allowedIps;
    if (Array.isArray(ips)) setAllowedIps(ips.join("\n"));
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/organizations/security", {
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
      if (!res.ok) throw new Error("Save failed");
      toast.success("Security settings updated");
    } catch {
      toast.error("Failed to save security settings");
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) return null;

  return (
    <div className="paper-card p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Organization security</h2>
        <p className="text-xs text-muted-foreground mt-1">
          IP allowlist and cross-project editor access for your org.
        </p>
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="cross-project">Editors can access all projects</Label>
        <Switch
          id="cross-project"
          checked={allowCrossProjectEditors}
          onCheckedChange={setAllowCrossProjectEditors}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="require-mfa">Require two-factor authentication</Label>
          <p className="text-xs text-muted-foreground">
            Members must enable TOTP before accessing the app.
          </p>
        </div>
        <Switch id="require-mfa" checked={requireMfa} onCheckedChange={setRequireMfa} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="allowed-ips">IP allowlist (one per line)</Label>
        <Input
          id="allowed-ips"
          value={allowedIps}
          onChange={(e) => setAllowedIps(e.target.value)}
          placeholder="203.0.113.10"
        />
      </div>
      <Button size="sm" onClick={() => void save()} disabled={saving}>
        Save security settings
      </Button>
    </div>
  );
}
