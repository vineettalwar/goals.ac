"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { useActiveProject } from "@/context/use-active-project";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AvailableSearchPropertiesResponse,
  SearchPropertyProvider,
} from "@/lib/integrations/search/search-property-types";

export function PropertyPicker({
  projectId,
  provider,
  shortLabel,
  onSaved,
}: {
  projectId: string;
  provider: SearchPropertyProvider;
  shortLabel: string;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<AvailableSearchPropertiesResponse | null>(null);
  const [selected, setSelected] = useState<string>("");
  const { activeProject } = useActiveProject();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/website-projects/${projectId}/search-properties/available?provider=${provider}`,
        { method: "POST" },
      );
      if (!res.ok) {
        setError("Could not load verified properties from your account.");
        return;
      }
      const data = (await res.json()) as AvailableSearchPropertiesResponse;
      if (data.linked) {
        toast.success(`${shortLabel} property linked`);
        onSaved();
        return;
      }
      setAvailable(data);
      const recommended = data.properties.find((p) => p.recommended);
      setSelected(recommended?.propertyUrl ?? data.properties[0]?.propertyUrl ?? "");
    } finally {
      setLoading(false);
    }
  }, [projectId, provider, shortLabel]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/search-properties`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, propertyUrl: selected }),
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
        <Spinner size="sm" /> Loading verified properties…
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>;
  }

  if (!available?.properties.length) {
    return (
      <div className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
        <p>
          No Search Console sites on this Google account. Properties are website URLs (for example{" "}
          <span className="font-medium">sc-domain:example.com</span>), not the project name
          {activeProject?.name ? (
            <>
              {" "}
              <span className="font-medium">{activeProject.name}</span>
            </>
          ) : null}
          .
        </p>
        <p>
          Verify{" "}
          <span className="font-medium break-all">{available?.projectUrl ?? activeProject?.url ?? "this site"}</span>{" "}
          in Search Console with the same Google account, then reconnect.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-amber-300/70 bg-amber-50/40 p-3 dark:border-amber-500/30 dark:bg-amber-500/5">
      <div>
        <p className="text-xs font-medium text-foreground">Choose a property</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Search Console lists site URLs, not
          {activeProject?.name ? (
            <>
              {" "}
              the name <span className="font-medium text-foreground">{activeProject.name}</span>
            </>
          ) : (
            " the project name"
          )}
          . We couldn&apos;t auto-match{" "}
          <span className="font-medium break-all">{available.projectUrl}</span>. Pick the verified
          property for this site.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`property-${provider}`} className="text-xs">
          Verified property
        </Label>
        <Select value={selected} onValueChange={setSelected} modal={false}>
          <SelectTrigger id={`property-${provider}`} className="h-9 text-xs">
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {available.properties.map((property) => (
              <SelectItem key={property.propertyUrl} value={property.propertyUrl} className="text-xs">
                <span className="flex items-center gap-2">
                  <span className="break-all">{property.propertyUrl}</span>
                  {property.recommended ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Recommended</span>
                  ) : null}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected ? (
          <p className="text-[11px] text-muted-foreground break-all">{selected}</p>
        ) : null}
      </div>
      <Button type="button" size="sm" onClick={onSave} disabled={!selected || saving}>
        {saving ? <Spinner size="sm" /> : null}
        {saving ? "Saving…" : "Use this property"}
      </Button>
    </div>
  );
}
