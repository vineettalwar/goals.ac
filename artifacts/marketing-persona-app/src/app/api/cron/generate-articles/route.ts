import { NextResponse } from "next/server";
import { enqueue, QUEUES } from "@workspace/jobs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await enqueue(QUEUES.contentGenerateSweep, {}).catch(() => {});

  return NextResponse.json({
    queued: {
      contentGenerateSweep: true,
    },
    message: "Project autopilot sweep enqueued",
  });
}
