"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PaidPlanId } from "@workspace/billing";

export function UpgradePlanButton({
  plan = "growth",
  label,
  variant = "default",
  className,
  disabled,
}: {
  plan?: PaidPlanId;
  label: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Checkout unavailable");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      className={className}
      disabled={disabled || loading}
      onClick={handleCheckout}
    >
      {loading ? "Redirecting…" : label}
    </Button>
  );
}
