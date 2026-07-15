"use client";

import Link from "next/link";

export type QuotaExhaustedPayload = {
  error?: string;
  message?: string;
};

export function QuotaUpgradePrompt({ message, className }: { message: string; className?: string }) {
  return (
    <div className={`space-y-2 text-center ${className ?? ""}`}>
      <p className="text-sm text-destructive">{message}</p>
      <p className="text-xs text-muted-foreground">
        Consulting clients use BYOK for unlimited AI generations. Add your key in{" "}
        <Link href="/integrations/ai" className="text-primary hover:underline">
          Integrations → AI
        </Link>
        .
      </p>
    </div>
  );
}
