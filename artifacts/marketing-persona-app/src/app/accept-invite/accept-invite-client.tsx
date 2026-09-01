"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type InviteStatus = "valid" | "expired" | "revoked" | "accepted" | "not_found";

interface InviteSession {
  status: InviteStatus;
  kind: "member" | "firm";
  email: string;
  role: string;
  organizationName: string | null;
  prefill: { orgName?: string; vertical?: string; websiteUrl?: string } | null;
  signedIn: boolean;
  signedInEmail: string | null;
  wrongEmail: boolean;
  signupToken?: string;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="paper-card p-8 text-center space-y-4">{children}</div>;
}

export function AcceptInviteClient({ invalidToken }: { invalidToken: boolean }) {
  const router = useRouter();
  const { data: authSession, status: authStatus } = useSession();

  const [invite, setInvite] = useState<InviteSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const loadInvite = useCallback(async () => {
    try {
      const res = await fetch("/api/invites/session");
      if (!res.ok) {
        setInvite(null);
        return;
      }
      const data = (await res.json()) as InviteSession;
      setInvite(data);
    } catch {
      setInvite(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  async function acceptInvite() {
    setAccepting(true);
    try {
      const res = await fetch("/api/invites/session/accept", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not accept the invite");
        return;
      }
      toast.success(invite?.kind === "firm" ? "Welcome to goals.ac" : "Invite accepted");
      router.push(data.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      toast.error("Could not accept the invite");
    } finally {
      setAccepting(false);
    }
  }

  if (loading || authStatus === "loading") {
    return (
      <div className="paper-card p-8 flex justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (invalidToken || !invite || invite.status === "not_found") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Invite not found</h1>
        <p className="text-sm text-muted-foreground">
          This invitation link isn&apos;t valid. It may have been opened somewhere it couldn&apos;t
          set a cookie, or the link itself is wrong. Ask whoever invited you to resend it.
        </p>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Go to login
        </Link>
      </Shell>
    );
  }

  if (invite.status === "accepted") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Already accepted</h1>
        <p className="text-sm text-muted-foreground">
          This invitation has already been used. If that was you, just log in below.
        </p>
        <Link href="/login">
          <Button>Go to login</Button>
        </Link>
      </Shell>
    );
  }

  if (invite.status === "revoked") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Invite revoked</h1>
        <p className="text-sm text-muted-foreground">
          Whoever sent this invite has canceled it. Reach out to them if you think that&apos;s a
          mistake.
        </p>
      </Shell>
    );
  }

  if (invite.status === "expired") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Invite expired</h1>
        <p className="text-sm text-muted-foreground">
          Invites are only good for 7 days. Ask{" "}
          {invite.kind === "firm" ? "whoever set this up" : `your ${invite.organizationName ?? "team"} admin`}{" "}
          to send you a new one.
        </p>
      </Shell>
    );
  }

  // invite.status === "valid" from here down.

  if (invite.wrongEmail) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Wrong account</h1>
        <p className="text-sm text-muted-foreground">
          This invite is for <strong>{invite.email}</strong>, but you&apos;re signed in as{" "}
          <strong>{invite.signedInEmail}</strong>. Sign out and come back to this link with the
          invited email.
        </p>
      </Shell>
    );
  }

  const heading =
    invite.kind === "firm"
      ? `Set up ${invite.prefill?.orgName?.trim() || "your firm"} on goals.ac`
      : `Join ${invite.organizationName ?? "the team"}`;

  const description =
    invite.kind === "firm" ? (
      <>
        You&apos;re setting up a new account for <strong>{invite.email}</strong>. Once you&apos;re
        in, we&apos;ll walk you through a few quick questions about your business and your voice.
      </>
    ) : (
      <>
        You&apos;ve been invited as <strong>{invite.role.replace(/_/g, " ")}</strong> for{" "}
        <strong>{invite.email}</strong>.
      </>
    );

  if (invite.signedIn && authSession?.user) {
    return (
      <div className="paper-card p-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">{heading}</h1>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </div>
        <Button onClick={() => void acceptInvite()} disabled={accepting} className="w-full">
          {accepting ? "Setting things up…" : invite.kind === "firm" ? "Create my account" : "Accept invitation"}
        </Button>
      </div>
    );
  }

  const callbackUrl = "/accept-invite";
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const signupHref = invite.signupToken
    ? `/signup?token=${encodeURIComponent(invite.signupToken)}&email=${encodeURIComponent(invite.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`
    : `/signup?email=${encodeURIComponent(invite.email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="paper-card p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{heading}</h1>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      </div>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Sign in or create an account with <strong>{invite.email}</strong> to continue.
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
    </div>
  );
}
