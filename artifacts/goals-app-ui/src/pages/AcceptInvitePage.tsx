import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { apiFetch } from "@/lib/api";

interface InviteDetails {
  email: string;
  role: string;
  organizationName: string;
  expired: boolean;
  acceptedAt: string | null;
}

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get("token") ?? "";

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadInvite = useCallback(async () => {
    if (!token) {
      setError("Missing invite token");
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch<{ invite: InviteDetails }>(`/api/invites/${encodeURIComponent(token)}`);
      setInvite(data.invite);
    } catch {
      setError("Invite not found or invalid");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  async function acceptInvite() {
    if (!token) return;
    setAccepting(true);
    setMessage(null);
    try {
      await apiFetch(`/api/invites/${encodeURIComponent(token)}`, { method: "POST" });
      setMessage("Invite accepted");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <p className="text-sm text-muted-foreground">Loading invitation…</p>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="paper-card w-full max-w-md space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Invalid invitation</h1>
          <p className="text-sm text-muted-foreground">{error ?? "This invite link is not valid."}</p>
          <Link to="/login" className="text-sm text-primary hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (invite.acceptedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="paper-card w-full max-w-md space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Invite already accepted</h1>
          <p className="text-sm text-muted-foreground">
            This invitation to {invite.organizationName} has already been used.
          </p>
          <Link
            to="/login"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (invite.expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="paper-card w-full max-w-md space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Invite expired</h1>
          <p className="text-sm text-muted-foreground">
            Ask your admin to send a new invitation to {invite.organizationName}.
          </p>
        </div>
      </div>
    );
  }

  const callbackUrl = `/accept-invite?token=${encodeURIComponent(token)}`;
  const signupHref = `/signup?token=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="paper-card w-full max-w-md space-y-6 p-8">
        <div>
          <h1 className="text-xl font-semibold">Join {invite.organizationName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ve been invited as <strong>{invite.role.replace("_", " ")}</strong> for{" "}
            <strong>{invite.email}</strong>.
          </p>
        </div>

        {message ? <p className="text-sm text-destructive">{message}</p> : null}

        {authLoading ? (
          <p className="text-center text-sm text-muted-foreground">Checking session…</p>
        ) : user ? (
          <div className="space-y-3">
            {user.email.toLowerCase() !== invite.email.toLowerCase() ? (
              <p className="text-sm text-destructive">
                You&apos;re signed in as {user.email}. Sign out and use {invite.email} to accept this invite.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void acceptInvite()}
                disabled={accepting}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {accepting ? "Accepting…" : "Accept invitation"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in or create an account with <strong>{invite.email}</strong> to join.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                to={loginHref}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-center text-sm font-medium hover:bg-secondary"
              >
                Sign in
              </Link>
              <Link
                to={signupHref}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground"
              >
                Create account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
