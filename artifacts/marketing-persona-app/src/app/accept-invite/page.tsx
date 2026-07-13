"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface InviteDetails {
  email: string;
  role: string;
  organizationName: string;
  expired: boolean;
  acceptedAt: string | null;
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const token = searchParams.get("token") ?? "";

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvite = useCallback(async () => {
    if (!token) {
      setError("Missing invite token");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/invites/${token}`);
      if (!res.ok) {
        setError("Invite not found or invalid");
        return;
      }
      const data = (await res.json()) as { invite: InviteDetails & { expired: boolean } };
      setInvite({
        email: data.invite.email,
        role: data.invite.role,
        organizationName: data.invite.organizationName,
        expired: data.invite.expired,
        acceptedAt: data.invite.acceptedAt,
      });
    } catch {
      setError("Could not load invite");
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
    try {
      const res = await fetch(`/api/invites/${token}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to accept invite");
        return;
      }
      toast.success("Invite accepted");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="paper-card p-8 text-center space-y-4">
        <h1 className="text-xl font-semibold">Invalid invitation</h1>
        <p className="text-sm text-muted-foreground">{error ?? "This invite link is not valid."}</p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  if (invite.acceptedAt) {
    return (
      <div className="paper-card p-8 text-center space-y-4">
        <h1 className="text-xl font-semibold">Invite already accepted</h1>
        <p className="text-sm text-muted-foreground">
          This invitation to {invite.organizationName} has already been used.
        </p>
        <Link href="/login">
          <Button>Go to login</Button>
        </Link>
      </div>
    );
  }

  if (invite.expired) {
    return (
      <div className="paper-card p-8 text-center space-y-4">
        <h1 className="text-xl font-semibold">Invite expired</h1>
        <p className="text-sm text-muted-foreground">
          Ask your admin to send a new invitation to {invite.organizationName}.
        </p>
      </div>
    );
  }

  const callbackUrl = `/accept-invite?token=${encodeURIComponent(token)}`;
  const signupHref = `/signup?token=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="paper-card p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Join {invite.organizationName}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You&apos;ve been invited as <strong>{invite.role.replace("_", " ")}</strong> for{" "}
          <strong>{invite.email}</strong>.
        </p>
      </div>

      {status === "loading" ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      ) : session?.user ? (
        <div className="space-y-3">
          {session.user.email.toLowerCase() !== invite.email.toLowerCase() ? (
            <p className="text-sm text-destructive">
              You&apos;re signed in as {session.user.email}. Sign out and use {invite.email} to
              accept this invite.
            </p>
          ) : (
            <Button onClick={() => void acceptInvite()} disabled={accepting} className="w-full">
              {accepting ? "Accepting…" : "Accept invitation"}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in or create an account with <strong>{invite.email}</strong> to join.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={loginHref} className="flex-1">
              <Button variant="outline" className="w-full">
                Sign in
              </Button>
            </Link>
            <Link href={signupHref} className="flex-1">
              <Button className="w-full">Create account</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="paper-card p-8 flex justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          }
        >
          <AcceptInviteContent />
        </Suspense>
      </div>
    </div>
  );
}
