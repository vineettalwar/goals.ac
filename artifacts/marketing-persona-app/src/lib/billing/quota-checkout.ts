"use client";

import { toast } from "sonner";

export function showQuotaExhaustedToast(input: { message: string }): void {
  toast.error(input.message, {
    description: "Add your Gemini or Bedrock key in Integrations → AI. BYOK clients have unlimited generations.",
  });
}

export function showInsufficientCreditsToast(input: { message: string }): void {
  toast.error(input.message, {
    description: "Add your API key in Integrations → AI, or contact us to top up platform credits.",
  });
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
