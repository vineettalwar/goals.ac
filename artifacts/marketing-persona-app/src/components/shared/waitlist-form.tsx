"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { publicApiUrl } from "@/lib/marketing/site/public-api";

type WaitlistFormProps = {
  featureKey: string;
  placeholder?: string;
  buttonLabel?: string;
  variant?: "default" | "dark";
};

export function WaitlistForm({
  featureKey,
  placeholder = "you@company.com",
  buttonLabel = "Join waitlist",
  variant = "default",
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = variant === "dark";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(publicApiUrl("/api/waitlist"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), featureKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not join waitlist");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className={cn("text-sm", isDark ? "text-white/65" : "text-muted-foreground")}>
        Thanks — we&apos;ll email you at <strong className={isDark ? "text-white" : undefined}>{email}</strong> when this launches.
      </p>
    );
  }

  return (
    <div className="max-w-md space-y-2">
      {error && (
        <p className={cn("text-sm", isDark ? "text-red-300" : "text-destructive")} role="alert">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <Input
        type="email"
        required
        placeholder={placeholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={cn("flex-1", isDark && "marketing-input-dark")}
      />
      <Button
        type="submit"
        disabled={loading}
        className={cn(isDark && "hero-cta-primary border-0 shrink-0")}
      >
        {loading ? "Joining…" : buttonLabel}
      </Button>
      </form>
    </div>
  );
}
