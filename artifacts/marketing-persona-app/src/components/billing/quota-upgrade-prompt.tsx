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
  return (
    <div className={`space-y-2 text-center ${className ?? ""}`}>
      <p className="text-sm text-destructive">{message}</p>
      <p className="text-xs text-muted-foreground">
        Consulting clients use BYOK for unlimited AI generations. Add your key in{" "}
        <a href="/settings?tab=ai" className="text-primary hover:underline">
          Settings → AI Providers
        </a>
        .
      </p>
    </div>
  );
}
