import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  contactSubmissionsTable,
  leadCapturesTable,
  roadmapsTable,
  waitlistSignupsTable,
} from "@workspace/db/schema-sqlite";
import { withCors } from "@workspace/cf-edge/cors";
import { db } from "../http";

const contactBody = z.object({
  email: z.string().email(),
  message: z.string().max(5000).optional(),
});

const waitlistBody = z.object({
  email: z.string().email(),
  featureKey: z.string().min(1).max(64),
});

const leadCaptureBody = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  companyUrl: z.string().url().optional(),
});

const vitalsBody = z.object({
  name: z.string(),
  value: z.number(),
  rating: z.string().optional(),
  navigationType: z.string().optional(),
  path: z.string().optional(),
});

export async function handleMarketingRoutes(
  request: Request,
  path: string,
): Promise<Response | null> {
  if (path === "/api/analytics/vitals" && request.method === "POST") {
    const parsed = vitalsBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Invalid payload" }, { status: 400 }));
    }
    return withCors(request, Response.json({ ok: true }));
  }

  const leadCaptureMatch = path.match(/^\/api\/roadmaps\/([^/]+)\/lead-capture$/);
  if (leadCaptureMatch && request.method === "POST") {
    const parsed = leadCaptureBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: `Invalid request: ${parsed.error.message}` }, { status: 400 }),
      );
    }

    const slug = leadCaptureMatch[1]!;
    const [roadmap] = await db()
      .select({ id: roadmapsTable.id })
      .from(roadmapsTable)
      .where(eq(roadmapsTable.slug, slug))
      .limit(1);

    if (!roadmap) {
      return withCors(request, Response.json({ error: "Roadmap not found" }, { status: 404 }));
    }

    const [existing] = await db()
      .select({ id: leadCapturesTable.id })
      .from(leadCapturesTable)
      .where(
        and(
          eq(leadCapturesTable.roadmapId, roadmap.id),
          eq(leadCapturesTable.email, parsed.data.email),
        ),
      )
      .limit(1);

    if (existing) {
      return withCors(
        request,
        Response.json({ id: existing.id, message: "Lead already captured" }, { status: 201 }),
      );
    }

    const [lead] = await db()
      .insert(leadCapturesTable)
      .values({
        roadmapId: roadmap.id,
        name: parsed.data.name,
        email: parsed.data.email,
        companyUrl: parsed.data.companyUrl ?? "",
      })
      .returning({ id: leadCapturesTable.id });

    return withCors(
      request,
      Response.json({ id: lead.id, message: "Lead captured successfully" }, { status: 201 }),
    );
  }

  if (path === "/api/contact" && request.method === "POST") {
    const parsed = contactBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(request, Response.json({ error: "Valid email required" }, { status: 400 }));
    }
    await db().insert(contactSubmissionsTable).values({
      email: parsed.data.email.toLowerCase(),
      message: parsed.data.message?.trim() || null,
    });
    return withCors(request, Response.json({ ok: true }));
  }

  if (path === "/api/waitlist" && request.method === "POST") {
    const parsed = waitlistBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return withCors(
        request,
        Response.json({ error: "Valid email and feature required" }, { status: 400 }),
      );
    }
    try {
      await db().insert(waitlistSignupsTable).values({
        email: parsed.data.email.toLowerCase(),
        featureKey: parsed.data.featureKey,
      });
    } catch {
      // duplicate ok
    }
    return withCors(request, Response.json({ ok: true }));
  }

  return null;
}
