"use client";

import { useEffect, useId, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { gravatarUrlForEmail, readAvatarFileAsDataUrl } from "@workspace/app-shell/settings";
import type { UsageSummary } from "@/components/settings/settings-types";

const PLAN_LABELS: Record<UsageSummary["plan"], string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

interface ProfilePanelProps {
  initialData?: { usage: UsageSummary | null } | null;
}

export function SettingsProfilePanel({ initialData }: ProfilePanelProps) {
  const { data: session, update } = useSession();
  const fileInputId = useId();
  const [name, setName] = useState(session?.user.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [gravatarPreview, setGravatarPreview] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(initialData?.usage ?? null);
  const [usageLoading, setUsageLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);

  const email = session?.user.email ?? "";

  useEffect(() => {
    setName(session?.user.name ?? "");
  }, [session?.user.name]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { user?: { avatarUrl?: string | null } } | null) => {
        if (cancelled || !body?.user) return;
        const stored = body.user.avatarUrl ?? "";
        setAvatarUrl(/^https:\/\//i.test(stored) ? stored : "");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!email.trim()) {
      setGravatarPreview(null);
      return;
    }
    void gravatarUrlForEmail(email, 128).then((url) => {
      if (!cancelled) setGravatarPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  useEffect(() => {
    if (initialData) return;
    fetch("/api/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.usage) setUsage(d.usage);
        setUsageLoading(false);
      });
  }, [initialData]);

  const previewSrc =
    avatarUrl.trim().startsWith("data:image/") || /^https:\/\//i.test(avatarUrl.trim())
      ? avatarUrl.trim()
      : (gravatarPreview ?? null);

  async function onAvatarFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setAvatarBusy(true);
    try {
      setAvatarUrl(await readAvatarFileAsDataUrl(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read image");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function saveProfile() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Display name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        user?: { name?: string; avatarUrl?: string | null; image?: string | null };
      };
      if (!res.ok) {
        toast.error(body.error ?? "Failed to save");
        return;
      }
      const next = body.user?.avatarUrl ?? null;
      setAvatarUrl(next && /^https:\/\//i.test(next) ? next : "");
      await update({ name: trimmedName, image: body.user?.image ?? null });
      toast.success("Profile updated");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-6 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">Avatar</p>
          <div className="flex flex-wrap items-center gap-4">
            {previewSrc ? (
              <img
                src={previewSrc}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold ring-1 ring-border">
                {(name.trim() || email).slice(0, 2).toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap gap-2">
                <label
                  htmlFor={fileInputId}
                  className={cn(
                    "inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary",
                    avatarBusy && "pointer-events-none opacity-50",
                  )}
                >
                  {avatarBusy ? "Processing…" : "Upload photo"}
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={avatarBusy}
                  onChange={(event) => {
                    void onAvatarFileChange(event.target.files);
                    event.target.value = "";
                  }}
                />
                {avatarUrl.trim() ? (
                  <Button type="button" variant="outline" onClick={() => setAvatarUrl("")}>
                    Remove
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a photo (stored in media). Otherwise Google photo if linked, then Gravatar.
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => void saveProfile()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="p-6 space-y-4">
        <h2 className="font-semibold">Usage this month</h2>
        {usageLoading && <p className="text-sm text-muted-foreground">Loading usage…</p>}
        {usage && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Articles</p>
              <p className="text-2xl font-bold tabular-nums">{usage.articlesThisMonth}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {usage.usesByok
                  ? "BYOK — unlimited"
                  : usage.quota != null
                    ? `${usage.quotaRemaining ?? 0} remaining on platform key`
                    : "Generated this month"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-2xl font-bold">{PLAN_LABELS[usage.plan]}</p>
            </div>
            {usage.usesByok && (
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">AI key</p>
                <p className="text-sm font-medium flex items-center gap-1.5 mt-1">
                  <KeyRound className="h-4 w-4 text-primary" />
                  BYOK — unlimited
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
