import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { listAllOrganizations, listOrganizationOptions, onboardOrganizationAsAdmin } from "@/lib/org/org-access";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import type { PlanId } from "@/lib/billing/usage";

const CreateOrgBody = z
  .object({
    ownerEmail: z.string().email(),
    ownerName: z.string().min(1).optional(),
    createUserIfMissing: z.boolean().optional().default(false),
    temporaryPassword: z.string().min(8).optional(),
    organizationName: z.string().min(1),
    plan: z.literal("starter").default("starter"),
    company: z
      .object({
        name: z.string().min(1),
        websiteUrl: z.string().url(),
        industry: z.string().min(1).default("Other"),
        description: z.string().min(5).default("Onboarded by platform admin."),
        targetAudience: z.string().min(5).default("General audience."),
      })
      .optional(),
    firstProject: z
      .object({
        name: z.string().min(1),
        url: z.string().url(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.createUserIfMissing) {
      if (!data.ownerName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Owner name is required when creating a new user",
          path: ["ownerName"],
        });
      }
      if (!data.temporaryPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Temporary password is required when creating a new user",
          path: ["temporaryPassword"],
        });
      }
    }
  });

export async function GET(req: Request) {
  const { error } = await requirePlatformAdminApi();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  if (searchParams.get("minimal") === "true") {
    const organizations = await listOrganizationOptions();
    return NextResponse.json({ organizations });
  }

  const organizations = await listAllOrganizations();
  return NextResponse.json({ organizations });
}

export async function POST(req: Request) {
  const { error } = await requirePlatformAdminApi();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = CreateOrgBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, data.ownerEmail))
    .limit(1);

  let ownerUserId = existingUser?.id;

  if (!ownerUserId) {
    if (!data.createUserIfMissing) {
      return NextResponse.json(
        { error: "User not found — enable create user or ask them to sign up first" },
        { status: 404 },
      );
    }

    const passwordHash = await bcrypt.hash(data.temporaryPassword!, 10);
    const [newUser] = await db
      .insert(usersTable)
      .values({
        name: data.ownerName!,
        email: data.ownerEmail,
        passwordHash,
        plan: data.plan,
      })
      .returning({ id: usersTable.id });
    ownerUserId = newUser.id;
  }

  const result = await onboardOrganizationAsAdmin({
    ownerUserId,
    organizationName: data.organizationName,
    plan: data.plan as PlanId,
    company: data.company,
    firstProject: data.firstProject,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(
    {
      organizationId: result.organizationId,
      companyId: result.companyId,
      projectId: result.projectId,
      ownerUserId,
    },
    { status: 201 },
  );
}
