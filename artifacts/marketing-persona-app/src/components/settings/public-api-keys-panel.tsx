"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ApiKeyScope =
  | "publish:write"
  | "content:read"
  | "render:preview"
  | "content:generate"
  | "image:generate";

type ApiKeyRow = {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  rateLimitPerHour: number;
  lastUsedAt: string | null;
  createdAt: string;
};

const SCOPE_LABELS: Record<ApiKeyScope, string> = {
  "render:preview": "Render preview",
  "content:read": "Read content",
  "publish:write": "Publish content",
  "content:generate": "Generate content (AI)",
  "image:generate": "Generate images",
};

interface Props {
  canManage: boolean;
}

export function PublicApiKeysPanel({ canManage }: Props) {
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiKeyScope[]>(["render:preview"]);
  const [creating, setCreating] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const scopeSet = useMemo(() => new Set(scopes), [scopes]);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/org/api-keys");
      if (!res.ok) throw new Error("Failed to load API keys");
      const data = (await res.json()) as { keys: ApiKeyRow[] };
      setKeys(data.keys ?? []);
    } catch {
      toast.error("Could not load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  function toggleScope(scope: ApiKeyScope) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function createKey() {
    if (!name.trim() || scopes.length === 0) {
      toast.error("Name and at least one scope are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/org/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create key");
      setRawKey(data.rawKey);
      setName("");
      setScopes(["render:preview"]);
      await loadKeys();
      toast.success("API key created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: number) {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/org/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke key");
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke API key");
    } finally {
      setRevokingId(null);
    }
  }

  function copyRawKey() {
    if (!rawKey) return;
    void navigator.clipboard.writeText(rawKey);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="paper-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Public API keys
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Headless access for render preview, content ingest, and publish. Keys start with{" "}
            <code className="text-xs">gac_</code>. Base URL:{" "}
            <code className="text-xs">/api/v1/</code>
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => { setDialogOpen(true); setRawKey(null); }}>
            <Plus className="h-4 w-4 mr-1" />
            New key
          </Button>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading keys…</p>}

      {!loading && keys.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No API keys yet. Create one to integrate with your CMS pipeline or automation tools.
        </p>
      )}

      {keys.length > 0 && (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{key.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {key.keyPrefix}… · {key.scopes.map((s) => SCOPE_LABELS[s]).join(", ")}
                </p>
                {key.lastUsedAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Last used {new Date(key.lastUsedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                  </p>
                )}
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void revokeKey(key.id)}
                  disabled={revokingId === key.id}
                  aria-label={`Revoke ${key.name}`}
                >
                  {revokingId === key.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rawKey ? "API key created" : "Create API key"}</DialogTitle>
            <DialogDescription>
              {rawKey
                ? "Copy this key now. It will not be shown again."
                : "Choose scopes for this key. Revoke anytime from Settings."}
            </DialogDescription>
          </DialogHeader>

          {rawKey ? (
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">{rawKey}</div>
              <Button onClick={copyRawKey} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="api-key-name">Name</Label>
                <Input
                  id="api-key-name"
                  placeholder="Production CMS pipeline"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Scopes</Label>
                {(Object.keys(SCOPE_LABELS) as ApiKeyScope[]).map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={scopeSet.has(scope)}
                      onChange={() => toggleScope(scope)}
                    />
                    {SCOPE_LABELS[scope]}
                  </label>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {rawKey ? (
              <Button onClick={() => setDialogOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void createKey()} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create key
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
