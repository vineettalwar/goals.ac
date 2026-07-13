import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { organizationsTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  createOrgInvite,
  listPendingInvites,
  OrgMemberRoleSchema,
} from "@/lib/org-access";
import { logOrgAudit } from "@/lib/org-audit";
import { buildOrgInviteEmail, sendEmail } from "@/lib/email";
import { requirePlatformAdminApi } from "@/lib/require-platform-admin";

const CreateInviteBody = z.object({
  email: z.string().email(),
  organizationId: z.number().int().positive(),
  role: OrgMemberRoleSchema,
  assignedProjectId: z.number().int().positive().nullable().optional(),
});

function clientIp(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export async function GET() {
  const { error } = await requirePlatformAdminApi();
  if (error) return error;

  const invites = await listPendingInvites();
  return NextResponse.json({
    invites: invites.map((invite) => ({
      ...invite,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateInviteBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const result = await createOrgInvite({
    organizationId: data.organizationId,
    email: data.email,
    role: data.role,
    assignedProjectId: data.assignedProjectId ?? null,
    invitedByUserId: admin.userId!,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const [[inviter], [org]] = await Promise.all([
    db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, admin.userId!))
      .limit(1),
    db
      .select({ name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, data.organizationId))
      .limit(1),
  ]);

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  const inviteUrl = `${appUrl}/accept-invite?token=${result.token}`;
  const orgName = org?.name ?? "your organization";

  const emailContent = buildOrgInviteEmail({
    inviteUrl,
    orgName,
    inviterName: inviter?.name ?? "Platform admin",
  });

  let emailSent = false;
  try {
    const sendResult = await sendEmail({
      to: data.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });
    emailSent = sendResult.sent;
  } catch {
    emailSent = false;
  }

  await logOrgAudit({
    organizationId: data.organizationId,
    actorUserId: admin.userId,
    action: "invite.sent",
    resourceType: "invite",
    resourceId: result.inviteId,
    metadata: { email: data.email, role: data.role, emailSent },
    ip: clientIp(req),
  });

  return NextResponse.json(
    {
      inviteId: result.inviteId,
      emailSent,
      inviteUrl: emailSent ? undefined : inviteUrl,
    },
    { status: 201 },
  );
}
