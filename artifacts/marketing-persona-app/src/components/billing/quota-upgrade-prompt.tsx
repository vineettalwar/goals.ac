"use client";

export type QuotaExhaustedPayload = {
  error?: string;
  message?: string;
};

export function isQuotaExhaustedPayload(value: unknown): value is QuotaExhaustedPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as QuotaExhaustedPayload).error === "quota_exhausted"
  );
}

export function isAiBillingDeniedPayload(value: unknown): value is QuotaExhaustedPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    ((value as QuotaExhaustedPayload).error === "quota_exhausted" ||
      (value as QuotaExhaustedPayload).error === "insufficient_credits")
  );
}

export function QuotaUpgradePrompt({ message, className }: { message: string; className?: string }) {
  return <p className={`text-sm text-destructive text-center ${className ?? ""}`}>{message}</p>;
}
