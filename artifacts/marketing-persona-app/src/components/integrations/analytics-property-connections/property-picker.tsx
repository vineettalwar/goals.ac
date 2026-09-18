"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AvailableAnalyticsPropertiesResponse } from "@/lib/integrations/analytics/analytics-property-types";

export function PropertyPicker({
  projectId,
  shortLabel,
  onSaved,
}: {
  projectId: string;
  shortLabel: string;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<AvailableAnalyticsPropertiesResponse | null>(null);
  const [selected, setSelected] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/analytics-properties/available`, {
        method: "POST",
      });
      if (!res.ok) {
        setError("Could not load GA4 properties from your account.");
        return;
      }
      const data = (await res.json()) as AvailableAnalyticsPropertiesResponse;
      setAvailable(data);
      const recommended = data.properties.find((p) => p.recommended);
      setSelected(recommended?.propertyId ?? data.properties[0]?.propertyId ?? "");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!selected) return;
    const property = available?.properties.find((p) => p.propertyId === selected);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/analytics-properties`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selected,
          streamId: property?.streamId ?? undefined,
        }),
      });
      if (!res.ok) {
        setError("Failed to save property selection.");
        return;
      }
      toast.success(`${shortLabel} property linked`);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner size="sm" /> Loading GA4 properties…
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }

  if (!available?.properties.length) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-300">
        No GA4 properties found on this account. Create a GA4 property for your site, then reconnect.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-amber-300/70 bg-amber-50/40 p-3 dark:border-amber-500/30 dark:bg-amber-500/5">
      <div>
        <p className="text-xs font-medium text-foreground">Choose a property</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          We couldn&apos;t auto-match <span className="font-medium">{available.projectUrl}</span>. Pick
          the GA4 property that belongs to this project.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ga4-property" className="text-xs">
          GA4 property
        </Label>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger id="ga4-property" className="h-9 text-xs">
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {available.properties.map((property) => (
              <SelectItem key={property.propertyId} value={property.propertyId} className="text-xs">
                <span className="flex items-center gap-2">
                  <span>{property.label}</span>
                  {property.recommended ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Recommended</span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected ? (
          <p className="text-[11px] text-muted-foreground break-all">
            {available.properties.find((p) => p.propertyId === selected)?.propertyName ?? selected}
          </p>
        ) : null}
      </div>
      <Button type="button" size="sm" onClick={onSave} disabled={!selected || saving}>
        {saving ? <Spinner size="sm" /> : null}
        {saving ? "Saving…" : "Use this property"}
      </Button>
    </div>
  );
}
