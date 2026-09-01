import { NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { resendOrgInvite } from "@/lib/org/org-access";
import { buildFirmInviteEmail, buildOrgInviteEmail, sendEmail } from "@/lib/utils/email";
import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const inviteId = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(inviteId) || inviteId <= 0) {
    return NextResponse.json({ error: "Invalid invite id" }, { status: 400 });
  }

  const result = await resendOrgInvite(inviteId);
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
  const inviterName = inviter?.name ?? "Platform admin";

  const emailContent =
    result.invite.kind === "firm"
      ? buildFirmInviteEmail({
          inviteUrl,
          contactName: result.invite.prefill?.contactName,
          orgName: result.invite.prefill?.orgName,
          inviterName,
        })
      : buildOrgInviteEmail({
          inviteUrl,
          orgName: result.invite.organizationName ?? "your organization",
          inviterName,
        });

  let emailSent = false;
  try {
    const sendResult = await sendEmail({
      to: result.invite.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });
    emailSent = sendResult.sent;
  } catch {
    emailSent = false;
  }

  return NextResponse.json({
    emailSent,
    inviteUrl: emailSent ? undefined : inviteUrl,
  });
}
