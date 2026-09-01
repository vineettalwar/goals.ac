import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/auth";
import { getInviteByToken } from "@/lib/org/org-access";
import { INVITE_TOKEN_COOKIE } from "@/app/api/invites/invite-cookie";

/** Invite details for the cookie-based accept flow — the token itself never reaches the client. */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(INVITE_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  let status: "valid" | "expired" | "revoked" | "accepted" = "valid";
  if (invite.acceptedAt) status = "accepted";
  else if (invite.revoked) status = "revoked";
  else if (invite.expired) status = "expired";

  const session = await getSession();
  const signedInEmail = session?.user?.email ?? null;
  const wrongEmail = Boolean(signedInEmail) && signedInEmail!.toLowerCase() !== invite.email.toLowerCase();

  return NextResponse.json({
    status,
    kind: invite.kind,
    email: invite.email,
    role: invite.role,
    organizationName: invite.organizationName,
    prefill: invite.kind === "firm" ? invite.prefill : null,
    signedIn: Boolean(signedInEmail),
    signedInEmail,
    wrongEmail,
    // Surfaced only while signed out. The account-creation form lives outside this stream's
    // ownership (`src/app/api/auth/signup`) and still takes the invite token as a query param
    // to bypass the invite-only signup gate and auto-accept the invite in the same request.
    // Everything up to here — the emailed link and this page — never puts the token in a URL;
    // closing this last hop needs a change to the signup route itself.
    signupToken: signedInEmail ? undefined : token,
  });
}
