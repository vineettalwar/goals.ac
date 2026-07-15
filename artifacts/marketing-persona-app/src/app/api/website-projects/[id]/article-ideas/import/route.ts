import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { requireSiteAdmin } from "@/lib/auth/require-site-admin";
import {
  insertArticleIdeas,
  parseCsvText,
  validateArticleIdeaRows,
  mapCsvHeaders,
  validateCsvUpload,
} from "@workspace/content-engine/articles/article-ideas-import-service";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireSiteAdmin();
  if (error) return error;

  const limited = await rateLimitResponse(
    `csv-import:${userId}`,
    RATE_LIMITS.CSV_IMPORT_PER_USER.limit,
    RATE_LIMITS.CSV_IMPORT_PER_USER.windowMs,
  );
  if (limited) return limited;

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
  const dryRun = url.searchParams.get("dryRun") === "true";

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const text = await file.text();
  const sizeError = validateCsvUpload({
    byteLength: new TextEncoder().encode(text).byteLength,
    rowCount: text.split(/\r?\n/).filter((line) => line.trim().length > 0).length,
  });
  if (sizeError) {
    return NextResponse.json({ error: sizeError }, { status: 400 });
  }

  const parsed = parseCsvText(text);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
  }

  const headerMapping = mapCsvHeaders(parsed[0]!.map((c) => String(c ?? "")));
  const validated = validateArticleIdeaRows(parsed, headerMapping);
  const validRows = validated.flatMap((r) =>
    r.errors.length === 0
      ? [
          {
            keyword: r.keyword,
            suggestedTitle: r.suggestedTitle,
            suggestedAngle: r.suggestedAngle,
            estimatedVolume: r.estimatedVolume,
            intent: r.intent,
            difficulty: r.difficulty,
          },
        ]
      : [],
  );

  const result = await insertArticleIdeas({
    projectId,
    userId: userId!,
    rows: validRows,
    source: "csv_import",
    fileName: file.name,
    dryRun,
  });

  return NextResponse.json({
    dryRun,
    ...result,
    preview: validated.slice(0, 50),
  });
}
