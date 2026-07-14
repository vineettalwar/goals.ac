"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCmsDestinations,
  type CmsConnectionSnapshot,
} from "@/lib/projects/publishing-destinations";

interface Props {
  projectId: string;
  cmsConnections: CmsConnectionSnapshot;
}

export function ProjectPrimaryDestinationPanel({ projectId, cmsConnections }: Props) {
  const [primaryBlogDestination, setPrimaryBlogDestination] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const connectedCms = useMemo(
    () => getCmsDestinations().filter((d) => !d.exportOnly && d.isConnected(cmsConnections)),
    [cmsConnections],
  );

  const loadSettings = useCallback(async () => {
    const res = await fetch(`/api/website-projects/${projectId}/publishing-settings`);
    if (res.ok) {
      const data = (await res.json()) as { primaryBlogDestination?: string | null };
      setPrimaryBlogDestination(data.primaryBlogDestination ?? null);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function onChange(value: string) {
    const next = value === "__none__" ? null : value;
    setPrimaryBlogDestination(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/website-projects/${projectId}/publishing-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryBlogDestination: next }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success(next ? "Primary blog destination saved" : "Primary blog destination cleared");
    } catch {
      toast.error("Failed to save primary destination");
      await loadSettings();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;
  if (connectedCms.length === 0) return null;

  const selectValue = primaryBlogDestination ?? "__none__";
  const currentValid =
    !primaryBlogDestination ||
    connectedCms.some((d) => d.id === primaryBlogDestination);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Default blog destination</CardTitle>
        <CardDescription>
          Pre-selects this CMS when creating blog-style content. You can still pick a different
          destination per piece.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-w-md">
          <Label htmlFor="primary-blog-destination">Primary blog destination</Label>
          <Select
            value={currentValid ? selectValue : "__none__"}
            onValueChange={onChange}
            disabled={saving}
          >
            <SelectTrigger id="primary-blog-destination">
              {saving ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </span>
              ) : (
                <SelectValue placeholder="None" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {connectedCms.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!currentValid && primaryBlogDestination ? (
            <p className="text-xs text-amber-600">
              Previously set destination is no longer connected. Choose a new one or clear it.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
