import { db } from "@workspace/db";
import { contentPiecesTable } from "@workspace/db/schema";
import type { ContentFormatType } from "@workspace/db/schema";
import { CONTENT_FORMAT_TYPES } from "@workspace/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { repurposeContentPiece } from "@workspace/content-engine/content-studio-generator";
import {
  assertPieceOwner,
  loadProjectBrand,
  loadUserAiSettings,
  wordCountFromMarkdown,
} from "@/lib/content/content-pieces-helpers";
import {
  billingDeniedResponse,
  cancelAiBilling,
  completeAiBilling,
  prepareAiBilling,
} from "@/lib/billing/ai-billing";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { z } from "zod";

const RepurposeBody = z.object({
  targetFormat: z.enum(CONTENT_FORMAT_TYPES as unknown as [string, ...string[]]),
  existingContent: z.string().min(50).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `ai-gen:user:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return limited;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return new Response(JSON.stringify({ error: "Invalid id" }), { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = RepurposeBody.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.errors[0]?.message ?? "Invalid request" }), { status: 400 });
  }

  const { piece, error: ownerError } = await assertPieceOwner(id, userId!);
  if (ownerError === "not_found") return new Response(JSON.stringify({ error: "Content piece not found" }), { status: 404 });
  if (ownerError === "forbidden") return new Response(JSON.stringify({ error: "Access denied" }), { status: 403 });

  const projectCtx = await loadProjectBrand(piece!.websiteProjectId, userId!);
  if (!projectCtx) return new Response(JSON.stringify({ error: "Project not found" }), { status: 404 });

  const { userApiKey, aiProviderOptions } = await loadUserAiSettings(userId!);
  const sourceContent = parsed.data.existingContent ?? piece!.bodyMarkdown ?? "";

  const billingPrep = await prepareAiBilling({
    userId: userId!,
    tier: "execution",
    quotaKind: "article",
    usedByok: Boolean(userApiKey),
  });
  if (!billingPrep.ok) return billingDeniedResponse(billingPrep);

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send("step", { step: "analyzing", label: "Analyzing source content" });
          send("step", { step: "generating", label: "Generating repurposed content" });

          const result = await repurposeContentPiece(
            parsed.data.targetFormat as ContentFormatType,
            projectCtx.brand,
            sourceContent,
            piece!.targetKeyword ?? "",
            userApiKey,
            aiProviderOptions,
          );

          send("step", { step: "saving", label: "Saving new piece" });

          const [inserted] = await db
            .insert(contentPiecesTable)
            .values({
              websiteProjectId: piece!.websiteProjectId,
              formatType: parsed.data.targetFormat as ContentFormatType,
              title: result.title,
              targetKeyword: result.target_keyword,
              bodyMarkdown: result.body_markdown,
              wordCount: wordCountFromMarkdown(result.body_markdown),
              status: "draft",
            })
            .returning();

          await completeAiBilling(billingPrep.ctx, {
            userId: userId!,
            eventType: "content_repurpose",
            usedByok: billingPrep.usedByok,
            tier: "execution",
          });

          send("done", inserted);
        } catch (err) {
          await cancelAiBilling(billingPrep.ctx);
          send("error", { error: err instanceof Error ? err.message : "Failed to repurpose content" });
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    },
  );
}
