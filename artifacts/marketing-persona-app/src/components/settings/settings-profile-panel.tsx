"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UsageSummary } from "@/components/settings/settings-types";

const PLAN_LABELS: Record<UsageSummary["plan"], string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

const profileSchema = z.object({
  name: z.string().min(1),
  avatarUrl: z.union([z.string().url("Must be a valid URL"), z.literal("")]).optional(),
});

interface ProfilePanelProps {
  initialData?: { usage: UsageSummary | null } | null;
}

export function SettingsProfilePanel({ initialData }: ProfilePanelProps) {
  const { data: session, update } = useSession();
  const [usage, setUsage] = useState<UsageSummary | null>(initialData?.usage ?? null);
  const [usageLoading, setUsageLoading] = useState(!initialData);

  const form = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      name: session?.user.name ?? "",
      avatarUrl: session?.user.image ?? "",
    },
  });

  useEffect(() => {
    if (initialData) return;
    fetch("/api/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.usage) setUsage(d.usage);
        setUsageLoading(false);
      });
  }, [initialData]);

  async function saveProfile(data: { name: string; avatarUrl?: string }) {
    const payload: { name: string; avatarUrl?: string | null } = { name: data.name };
    if (data.avatarUrl !== undefined) {
      payload.avatarUrl = data.avatarUrl === "" ? null : data.avatarUrl;
    }
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { toast.error("Failed to save"); return; }
    const body = (await res.json()) as { user?: { name?: string; avatarUrl?: string | null } };
    const avatarUrl = body.user?.avatarUrl ?? (data.avatarUrl === "" ? undefined : data.avatarUrl);
    await update({ name: data.name, image: avatarUrl ?? undefined });
    toast.success("Profile updated");
  }

  return (
    <div className="space-y-6">
      <div className="paper-card p-6 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">{session?.user.email}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" {...form.register("name")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <Input
            id="avatarUrl"
            placeholder="https://example.com/photo.jpg"
            {...form.register("avatarUrl")}
          />
          <p className="text-xs text-muted-foreground">
            Paste a publicly accessible image URL. Leave blank to use your initials.
          </p>
        </div>
        <Button onClick={form.handleSubmit(saveProfile)}>Save changes</Button>
      </div>

      <div className="paper-card p-6 space-y-4">
        <h2 className="font-semibold">Usage this month</h2>
        {usageLoading && <p className="text-sm text-muted-foreground">Loading usage…</p>}
        {usage && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Articles</p>
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
              <p className="text-xs text-muted-foreground uppercase">Plan</p>
              <p className="text-2xl font-bold">{PLAN_LABELS[usage.plan]}</p>
            </div>
            {usage.usesByok && (
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground uppercase">AI key</p>
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
