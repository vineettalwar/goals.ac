import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { createFirmInvite } from "@/lib/org/org-access";
import { buildFirmInviteEmail, sendEmail } from "@/lib/utils/email";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";

const VERTICALS = ["law", "dental", "software", "marketing", "other"] as const;

const CreateFirmInviteBody = z.object({
  email: z.string().email(),
  orgName: z.string().trim().min(1).max(200).optional(),
  vertical: z.enum(VERTICALS).optional(),
  websiteUrl: z.string().trim().url().optional(),
  plan: z.string().trim().min(1).max(50).optional(),
  contactName: z.string().trim().min(1).max(200).optional(),
});

/**
 * Firm invites have no organization yet — org_audit_log requires one, so unlike the member
 * invite route (which logs invite.sent against the org), this one only logs at acceptance,
 * once the org actually exists.
 */
export async function POST(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const body = await req.json().catch(() => null);
  const parsed = CreateFirmInviteBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const result = await createFirmInvite({
    email: data.email,
    prefill: {
      orgName: data.orgName,
      vertical: data.vertical,
      websiteUrl: data.websiteUrl,
      plan: data.plan,
      contactName: data.contactName,
    },
    invitedByUserId: admin.userId!,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const [inviter] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, admin.userId!))
    .limit(1);

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  const inviteUrl = `${appUrl}/accept-invite/${result.token}`;

  const emailContent = buildFirmInviteEmail({
    inviteUrl,
    contactName: data.contactName,
    orgName: data.orgName,
    inviterName: inviter?.name ?? "The goals.ac team",
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

  return NextResponse.json(
    {
      inviteId: result.inviteId,
      emailSent,
      inviteUrl: emailSent ? undefined : inviteUrl,
    },
    { status: 201 },
  );
}
