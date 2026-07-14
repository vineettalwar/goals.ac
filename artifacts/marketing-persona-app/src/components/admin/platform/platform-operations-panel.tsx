"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface PlatformSettings {
  platformEnabled: boolean;
  aiGenerationEnabled: boolean;
  maintenanceMessage: string | null;
  signupsEnabled: boolean;
}

type ToggleKey = keyof Pick<
  PlatformSettings,
  "platformEnabled" | "aiGenerationEnabled" | "signupsEnabled"
>;

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 first:pt-0">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function OperationsSkeleton() {
  return (
    <div className="space-y-0 divide-y divide-border animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="py-4">
          <div className="h-4 w-32 rounded bg-secondary/70" />
          <div className="mt-2 h-3 w-48 rounded bg-secondary/70" />
        </div>
      ))}
    </div>
  );
}

export function PlatformOperationsPanel() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/platform-settings")
      .then((r) => r.json())
      .then((data: PlatformSettings) => {
        setSettings(data);
        setMessage(data.maintenanceMessage ?? "");
      })
      .catch(() => setError("Failed to load platform settings"));
  }, []);

  async function save(patch: Partial<PlatformSettings>) {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...patch,
          maintenanceMessage: message || null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as PlatformSettings;
      setSettings(data);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: ToggleKey, checked: boolean) {
    void save({ [key]: checked });
  }

  if (!settings) return <OperationsSkeleton />;

  return (
    <div className="divide-y divide-border">
      <p className="pb-4 text-xs text-muted-foreground">
        System-wide access and feature gates. Stripe and Resend are managed under Admin →
        Integrations.
      </p>

      <ToggleRow
        id="platform-enabled"
        label="Public access"
        description="When off, visitors see the maintenance page."
        checked={settings.platformEnabled}
        disabled={saving}
        onCheckedChange={(checked) => toggle("platformEnabled", checked)}
      />

      <ToggleRow
        id="ai-enabled"
        label="AI services"
        description="Pauses generation, scanning, and autopilot jobs."
        checked={settings.aiGenerationEnabled}
        disabled={saving}
        onCheckedChange={(checked) => toggle("aiGenerationEnabled", checked)}
      />

      <ToggleRow
        id="signups-enabled"
        label="Public signups"
        description="Allow self-serve account creation without an invite link."
        checked={settings.signupsEnabled}
        disabled={saving}
        onCheckedChange={(checked) => toggle("signupsEnabled", checked)}
      />

      <div className="space-y-3 py-4 pb-0">
        <div>
          <Label htmlFor="maintenance-message" className="text-sm font-medium">
            Maintenance notice
          </Label>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Shown when public access is off.
          </p>
        </div>
        <Textarea
          id="maintenance-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="We're performing scheduled maintenance. Back shortly."
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" disabled={saving} onClick={() => void save({})}>
            {saving ? "Saving…" : "Save notice"}
          </Button>
        </div>
      </div>

      {error && <p className="pt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
