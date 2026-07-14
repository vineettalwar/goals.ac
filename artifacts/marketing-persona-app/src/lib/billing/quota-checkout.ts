"use client";

import { toast } from "sonner";

export async function startPlanCheckout(): Promise<void> {
  throw new Error("Paid plans are not available. Add your API key in Settings → AI Providers.");
}

export function showQuotaExhaustedToast(input: { message: string }): void {
  toast.error(input.message, {
    description: "Add your Gemini or Bedrock key in Settings → AI Providers for unlimited generations.",
  });
}

export function showInsufficientCreditsToast(input: { message: string }): void {
  toast.error(input.message);
}

export function handleAiBillingError(data: {
  error?: string;
  message?: string;
}): void {
  if (data.error === "insufficient_credits") {
    showInsufficientCreditsToast({
      message: data.message ?? "Insufficient credits for this generation.",
    });
    return;
  }
  if (data.error === "quota_exhausted") {
    showQuotaExhaustedToast({
      message: data.message ?? "Monthly generation quota exhausted.",
    });
  }
}
