"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PublishReliabilityAlertButton({
  disabled,
  failedPublishRecordsCount24h,
}: {
  disabled: boolean;
  failedPublishRecordsCount24h: number;
}) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        disabled={disabled || sending || failedPublishRecordsCount24h === 0}
        onClick={async () => {
          setSending(true);
          setMessage(null);
          try {
            const res = await fetch("/api/admin/publish-reliability/alert", { method: "POST" });
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              setMessage((body as { error?: string } | null)?.error ?? "Alert email failed");
              return;
            }
            const body = (await res.json().catch(() => ({}))) as { sent?: boolean; reason?: string };
            setMessage(
              body.sent
                ? "Alert email sent"
                : body.reason
                  ? `Alert not sent: ${body.reason}`
                  : "Alert not sent",
            );
          } catch {
            setMessage("Alert request failed");
          } finally {
            setSending(false);
          }
        }}
      >
        {sending ? "Sending…" : "Send alert email"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

