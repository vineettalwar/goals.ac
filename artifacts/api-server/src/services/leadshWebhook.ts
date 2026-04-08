const WEBHOOK_URL = process.env.LEADSH_WEBHOOK_URL;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

interface LeadshPayload {
  event: "lead.captured";
  roadmapSlug: string;
  industry: string;
  location: string;
  stage: string;
  lead: {
    name: string;
    email: string;
    companyUrl: string;
  };
  capturedAt: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deliverWithRetry(
  payload: LeadshPayload,
  logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void }
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(WEBHOOK_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "goals.ac/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        logger.info({ attempt, roadmapSlug: payload.roadmapSlug }, "Lead.sh webhook delivered");
        return;
      }

      const text = await res.text().catch(() => "");
      logger.warn(
        { attempt, status: res.status, body: text.slice(0, 200) },
        "Lead.sh webhook returned non-OK status"
      );
    } catch (err) {
      logger.warn({ attempt, err }, "Lead.sh webhook request failed");
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  logger.error({ roadmapSlug: payload.roadmapSlug }, "Lead.sh webhook delivery failed after all retries");
}

export function fireLeadshWebhook(
  payload: Omit<LeadshPayload, "event" | "capturedAt">,
  logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void }
): void {
  if (!WEBHOOK_URL) {
    logger.info("LEADSH_WEBHOOK_URL not configured — skipping webhook");
    return;
  }

  const fullPayload: LeadshPayload = {
    event: "lead.captured",
    capturedAt: new Date().toISOString(),
    ...payload,
  };

  deliverWithRetry(fullPayload, logger).catch((err) => {
    logger.error({ err }, "Unexpected error in Lead.sh webhook delivery");
  });
}
