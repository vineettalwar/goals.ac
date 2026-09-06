import { resolvePlatformResendCredentials } from "@workspace/billing";
import { logger } from "../../core/logger";

export interface PlatformEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export interface PlatformEmailResult {
  sent: boolean;
  reason?: string;
}

/**
 * Send an email via the platform Resend credentials (DB row or env var).
 * Never throws — logs and returns `{ sent: false, reason }` on any failure.
 */
export async function sendPlatformEmail(
  opts: PlatformEmailOptions,
): Promise<PlatformEmailResult> {
  try {
    const resend = await resolvePlatformResendCredentials();
    if (!resend?.apiKey) {
      return { sent: false, reason: "no_resend_credentials" };
    }

    const recipients = Array.isArray(opts.to) ? opts.to : [opts.to];
    if (recipients.length === 0) {
      return { sent: false, reason: "no_recipients" };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resend.fromEmail,
        to: recipients,
        subject: opts.subject,
        html: opts.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error(
        { status: res.status, body: body.slice(0, 200) },
        "Resend API returned non-OK",
      );
      return { sent: false, reason: `resend_${res.status}` };
    }

    return { sent: true };
  } catch (err) {
    logger.error({ err }, "sendPlatformEmail failed");
    return { sent: false, reason: "exception" };
  }
}

/** Resolve APP_ORIGIN for email links — works outside Next.js. */
export function resolveAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "") ||
    process.env.APP_ORIGIN?.trim().replace(/\/+$/, "") ||
    "https://app.goals.ac"
  );
}
