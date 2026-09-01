import { redirect } from "next/navigation";
import { AcceptInviteClient } from "./accept-invite-client";

/**
 * Canonical accept-invite screen. Reads the invite from the `goals_invite_token` cookie set by
 * `/accept-invite/[token]` — never from the URL. The `?token=` fallback below exists only so an
 * invite link already sent before this change (or a bookmark of the old URL shape) keeps working:
 * it is redirected into the cookie-setting route rather than read directly.
 */
export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; e?: string }>;
}) {
  const params = await searchParams;
  if (params.token) {
    redirect(`/accept-invite/${encodeURIComponent(params.token)}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <AcceptInviteClient invalidToken={params.e === "invalid"} />
      </div>
    </div>
  );
}
