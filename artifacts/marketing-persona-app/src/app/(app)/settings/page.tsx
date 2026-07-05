"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const profileSchema = z.object({
  name: z.string().min(1),
});

const geminiSchema = z.object({
  geminiKey: z.string().min(1, "Enter a Gemini API key"),
});

interface UsageSummary {
  plan: "starter" | "growth" | "scale";
  articlesThisMonth: number;
  quota: number | null;
  quotaRemaining: number | null;
  usesByok: boolean;
  byokSpendThisMonthUsd: number;
}

const PLAN_LABELS: Record<UsageSummary["plan"], string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

function UsageDashboard() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.usage) setUsage(data.usage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="paper-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Usage this month</h2>
        {usage && (
          <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            {PLAN_LABELS[usage.plan]} plan
          </span>
        )}
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading usage…</p>}

      {!loading && usage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Articles generated</p>
            <p className="text-2xl font-bold">{usage.articlesThisMonth}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Quota remaining</p>
            <p className="text-2xl font-bold">
              {usage.usesByok
                ? "Unlimited — your API key"
                : usage.quotaRemaining === null
                  ? "Unlimited"
                  : usage.quotaRemaining}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Estimated BYOK spend</p>
            <p className="text-2xl font-bold">
              {usage.usesByok ? `~$${usage.byokSpendThisMonthUsd.toFixed(2)}` : "—"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan limit</p>
            <p className="text-2xl font-bold">{usage.quota === null ? "Unlimited" : `${usage.quota}/mo`}</p>
          </div>
        </div>
      )}

      {!loading && !usage && (
        <p className="text-sm text-muted-foreground">Unable to load usage right now.</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session, update } = useSession();

  const profileForm = useForm({ resolver: zodResolver(profileSchema), values: { name: session?.user.name ?? "" } });
  const geminiForm = useForm({ resolver: zodResolver(geminiSchema), defaultValues: { geminiKey: "" } });

  async function saveProfile(data: { name: string }) {
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name }),
    });
    if (!res.ok) { toast.error("Failed to save"); return; }
    await update({ name: data.name });
    toast.success("Profile updated");
  }

  async function saveGeminiKey(data: { geminiKey: string }) {
    const res = await fetch("/api/auth/gemini-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: data.geminiKey }),
    });
    if (!res.ok) { toast.error("Failed to save key"); return; }
    geminiForm.reset();
    toast.success("Gemini API key saved");
  }

  return (
    <div className="px-8 py-8 max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Usage dashboard */}
      <UsageDashboard />

      {/* Profile */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="font-semibold">Account</h2>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">{session?.user.email}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" {...profileForm.register("name")} />
        </div>
        <Button onClick={profileForm.handleSubmit(saveProfile)}>Save changes</Button>
      </div>

      {/* Gemini API key */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="font-semibold">Gemini API key</h2>
        <p className="text-sm text-muted-foreground">
          Optionally provide your own Gemini API key. It&apos;s encrypted and stored securely.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="geminiKey">API key</Label>
          <Input id="geminiKey" type="password" placeholder="AIza..." {...geminiForm.register("geminiKey")} />
        </div>
        <Button onClick={geminiForm.handleSubmit(saveGeminiKey)}>Save key</Button>
      </div>
    </div>
  );
}
