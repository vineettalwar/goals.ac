"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AuthView } from "@workspace/app-shell/auth";
import { Button } from "@/components/ui/button";
import { buildAuthRedirectParams } from "@/lib/projects/roadmap-intent";
import { useRoadmapIntent } from "@/hooks/use-roadmap-intent";
import { signInWithCredentials } from "@/lib/auth/sign-in-credentials";
import {
  CONTACT_CTA_LABEL,
  CONTACT_EMAIL,
  CONTACT_HREF,
  CONTACT_MAILTO,
} from "@/lib/marketing/site/marketing-contact";

interface SignupPageClientProps {
  signupsEnabled: boolean;
  callbackUrl: string | null;
}

export function SignupPageClient({ signupsEnabled, callbackUrl }: SignupPageClientProps) {
  return (
    <Suspense fallback={<div className="paper-card p-8 animate-pulse h-96 rounded-xl bg-secondary/40" />}>
      <SignupPageContent signupsEnabled={signupsEnabled} callbackUrl={callbackUrl} />
    </Suspense>
  );
}

function InviteOnlyMessage() {
  return (
    <div className="paper-card p-8 text-center">
      <h1 className="text-2xl font-bold">Invite only</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        goals.ac is invite-only while we onboard design partners. Ask your contact for an invite
        link, or reach out if you want a hands-on program.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link href={CONTACT_HREF}>{CONTACT_CTA_LABEL}</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <a href={CONTACT_MAILTO}>Email {CONTACT_EMAIL}</a>
        </Button>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function SignupPageContent({ signupsEnabled, callbackUrl }: SignupPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roadmapIntent = useRoadmapIntent();
  const signupReferrer = searchParams.get("from")?.trim() || roadmapIntent?.referrer;
  const inviteToken = searchParams.get("token")?.trim() || undefined;
  const inviteEmail = searchParams.get("email")?.trim() || undefined;
  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : `/login?${buildAuthRedirectParams(signupReferrer).toString()}`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState(inviteEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSignup = signupsEnabled || Boolean(inviteToken);

  if (!canSignup) {
    return <InviteOnlyMessage />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
        referrer: signupReferrer,
        inviteToken,
      }),
    });

    if (!res.ok) {
      const { error: signupError } = await res.json().catch(() => ({ error: "Signup failed" }));
      const message = signupError ?? "Signup failed";
      setError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    const signupBody = (await res.json()) as { organizationId?: number | null };

    const result = await signInWithCredentials(email.trim(), password);
    setSubmitting(false);

    if (!result.ok) {
      toast.error("Account created but sign-in failed. Please log in.");
      router.push(loginHref);
    } else if (callbackUrl) {
      router.push(callbackUrl);
      router.refresh();
    } else if (signupBody.organizationId) {
      router.push("/dashboard");
      router.refresh();
    } else {
      router.prefetch("/onboarding");
      router.push("/onboarding");
      router.refresh();
    }
  }

  return (
    <AuthView
      mode="signup"
      name={name}
      email={email}
      password={password}
      onNameChange={setName}
      onEmailChange={inviteEmail ? () => {} : setEmail}
      onPasswordChange={setPassword}
      error={error}
      submitting={submitting}
      onSubmit={onSubmit}
      renderLink={({ href, className, children }) => (
        <Link href={loginHref} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
