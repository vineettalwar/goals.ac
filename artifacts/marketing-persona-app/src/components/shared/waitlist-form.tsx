"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const isDark = variant === "dark";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), featureKey }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not join waitlist");
      return;
    }
    setDone(true);
    toast.success("You're on the list — we'll notify you when it's ready.");
  }

  if (done) {
    return (
      <p className={cn("text-sm", isDark ? "text-white/65" : "text-muted-foreground")}>
        Thanks — we&apos;ll email you at <strong className={isDark ? "text-white" : undefined}>{email}</strong> when this launches.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-md">
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
  );
}
