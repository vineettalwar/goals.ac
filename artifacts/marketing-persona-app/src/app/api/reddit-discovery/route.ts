import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { brandProfilesTable, websiteProjectsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireProjectAccess } from "@/lib/projects/project-access";
import { resolveAiClientForUser } from "@workspace/content-engine/support/ai/resolve-ai-client-for-user";
import { cancelAiBilling, completeAiBilling, prepareAiBilling } from "@/lib/billing/ai-billing";
import { rateLimitResponse, RATE_LIMITS } from "@/lib/auth/rate-limit";
import { runRedditDiscovery } from "@workspace/content-engine/social/reddit-discovery";

const Body = z.object({ projectId: z.number().int().positive() });

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const limited = await rateLimitResponse(
    `reddit-disc:${userId}`,
    RATE_LIMITS.AI_GENERATION_PER_USER.limit,
    RATE_LIMITS.AI_GENERATION_PER_USER.windowMs,
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const access = await requireProjectAccess(parsed.data.projectId, userId!);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [[project], [brand]] = await Promise.all([
    db
      .select()
      .from(websiteProjectsTable)
      .where(eq(websiteProjectsTable.id, parsed.data.projectId))
      .limit(1),
    db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.websiteProjectId, parsed.data.projectId))
      .limit(1),
  ]);

  type OkBilling = Extract<Awaited<ReturnType<typeof prepareAiBilling>>, { ok: true }>;
  const billing = { current: null as OkBilling | null };

  try {
    const result = await runRedditDiscovery({
      projectId: parsed.data.projectId,
      projectName: project?.name ?? "B2B SaaS",
      projectUrl: project?.url,
      industry: brand?.industry,
      audience: brand?.targetAudience,
      primaryKeywords: brand?.primaryKeywords,
      generate: async (prompt) => {
        const billingPrep = await prepareAiBilling({
          userId: userId!,
          tier: "rapid",
          quotaKind: "article",
        });
        if (!billingPrep.ok) {
          throw Object.assign(new Error("billing"), { response: billingPrep.response });
        }
        billing.current = billingPrep;
        try {
          const { client } = await resolveAiClientForUser(userId!);
          const response = await client.generate({
            prompt,
            responseMimeType: "application/json",
            maxOutputTokens: 2048,
          });
          return response.text ?? "";
        } catch (err) {
          await cancelAiBilling(billingPrep.ctx, "ai_unavailable");
          billing.current = null;
          throw err;
        }
      },
    });

    if (billing.current && result.threads.length > 0) {
      await completeAiBilling(billing.current.ctx, {
        userId: userId!,
        eventType: "reddit_discovery",
        usedByok: billing.current.usedByok,
        tier: "rapid",
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err && typeof err === "object" && "response" in err) {
      return (err as { response: Response }).response;
    }
    if (billing.current) {
      await cancelAiBilling(billing.current.ctx, err instanceof Error ? err.message : "generation_failed");
    }
    const msg = err instanceof Error ? err.message : "";
    if (
      msg.includes("not configured") ||
      msg.includes("No Gemini API key") ||
      msg.includes("failed to initialize")
    ) {
      return NextResponse.json(
        {
          error: "ai_unavailable",
          message:
            "No AI provider configured. Set your provider in Settings or configure AI_PROVIDER and provider credentials in .env.local.",
        },
        { status: 503 },
      );
    }
    if (msg.toLowerCase().includes("parse")) {
      return NextResponse.json({ error: "Failed to parse reply drafts" }, { status: 500 });
    }
    return NextResponse.json({ error: "Reddit discovery failed" }, { status: 500 });
  }
}
