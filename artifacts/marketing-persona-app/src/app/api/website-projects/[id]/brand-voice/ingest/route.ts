import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { ingestBrandVoiceDocuments } from "@workspace/content-engine/brand/brand-voice-indexer";

const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 10;

const JsonBody = z.object({
  texts: z.array(z.string().min(80)).min(1).max(20),
  title: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const access = await requireProjectAccess(projectId, userId!);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const contentType = req.headers.get("content-type") ?? "";
  const documents: Array<{ text: string; title?: string; fileName?: string }> = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const pasted = formData.get("text");
    if (typeof pasted === "string" && pasted.trim().length >= 80) {
      documents.push({ text: pasted.trim(), title: "Pasted sample" });
    }

    const files = [...formData.getAll("files"), ...formData.getAll("file")].filter(
      (entry): entry is File => entry instanceof File,
    );

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files per upload` }, { status: 400 });
    }

    for (const file of files) {
      const text = await file.text();
      const bytes = new TextEncoder().encode(text).byteLength;
      if (bytes > MAX_TEXT_BYTES) {
        return NextResponse.json({ error: `File ${file.name} exceeds 2MB limit` }, { status: 400 });
      }
      if (text.trim().length < 80) continue;
      documents.push({
        text: text.trim(),
        title: file.name,
        fileName: file.name,
      });
    }
  } else {
    const body = await req.json().catch(() => null);
    const parsed = JsonBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Provide texts[] (min 80 chars each) or multipart upload" }, { status: 400 });
    }
    for (const text of parsed.data.texts) {
      documents.push({ text, title: parsed.data.title ?? "Uploaded sample" });
    }
  }

  if (documents.length === 0) {
    return NextResponse.json({ error: "No valid text samples (minimum 80 characters each)" }, { status: 400 });
  }

  const sourceIds = await ingestBrandVoiceDocuments(
    projectId,
    documents.map((doc, index) => ({
      sourceType: "upload" as const,
      sourceUrl: `upload:${Date.now()}:${index}`,
      title: doc.title ?? `Upload ${index + 1}`,
      text: doc.text,
      metadata: { fileName: doc.fileName },
    })),
  );

  return NextResponse.json({ ok: true, sourceIds, count: sourceIds.length });
}
