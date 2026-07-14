import { NextResponse } from "next/server";
import { enqueue, QUEUES } from "@workspace/jobs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await enqueue(QUEUES.contentGenerateSweep, {}).catch(() => {});

  const legacyEnabled = process.env.ENABLE_LEGACY_COMPANY_AUTOPILOT_CRON === "true";
  if (legacyEnabled) {
    await enqueue(QUEUES.legacyCompanyAutopilot, {}).catch(() => {});
  }

  return NextResponse.json({
    queued: {
      contentGenerateSweep: true,
      legacyCompanyAutopilot: legacyEnabled,
    },
    message: legacyEnabled
      ? "Autopilot sweeps enqueued (project + legacy company)"
      : "Project autopilot sweep enqueued; legacy company autopilot disabled",
  });
}
