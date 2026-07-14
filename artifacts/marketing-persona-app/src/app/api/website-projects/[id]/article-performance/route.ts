import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { getArticlePerformance } from "@workspace/content-engine/article-performance";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate and endDate query params are required" }, { status: 400 });
  }
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return NextResponse.json({ error: "Dates must be YYYY-MM-DD" }, { status: 400 });
  }
  if (startDate > endDate) {
    return NextResponse.json({ error: "startDate must be on or before endDate" }, { status: 400 });
  }

  try {
    const payload = await getArticlePerformance(projectId, startDate, endDate);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load article performance" },
      { status: 502 },
    );
  }
}
