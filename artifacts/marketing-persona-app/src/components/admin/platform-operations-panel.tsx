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

  if (!settings) {
    return <p className="text-sm text-muted-foreground">Loading platform settings…</p>;
  }

  return (
    <div className="paper-card p-5 space-y-5">
      <div>
        <h2 className="font-semibold">Platform operations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage public access and AI service availability.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="platform-enabled">Public access</Label>
          <p className="text-xs text-muted-foreground">
            When off, visitors see the scheduled maintenance page.
          </p>
        </div>
        <Switch
          id="platform-enabled"
          checked={settings.platformEnabled}
          disabled={saving}
          onCheckedChange={(checked) => void save({ platformEnabled: checked })}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="ai-enabled">AI services</Label>
          <p className="text-xs text-muted-foreground">
            Pauses content generation, website scanning, and autopilot jobs.
          </p>
        </div>
        <Switch
          id="ai-enabled"
          checked={settings.aiGenerationEnabled}
          disabled={saving}
          onCheckedChange={(checked) => void save({ aiGenerationEnabled: checked })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maintenance-message">Maintenance notice (optional)</Label>
        <Textarea
          id="maintenance-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Message shown on the maintenance page"
        />
        <Button size="sm" variant="outline" disabled={saving} onClick={() => void save({})}>
          Save notice
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
