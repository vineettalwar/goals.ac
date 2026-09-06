"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AuthView } from "@workspace/app-shell/auth";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/marketing/site/marketing-contact";
import { signInWithCredentials } from "@/lib/auth/sign-in-credentials";

type LoginPageClientProps = {
  postLoginRedirect: string;
};

export function LoginPageClient({ postLoginRedirect }: LoginPageClientProps) {
  return (
    <Suspense fallback={<div className="paper-card p-8 animate-pulse h-80 rounded-xl bg-secondary/40" />}>
      <LoginPageContent postLoginRedirect={postLoginRedirect} />
    </Suspense>
  );
}

function LoginPageContent({ postLoginRedirect }: LoginPageClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signInWithCredentials(email.trim(), password);
      if (!result.ok) {
        setError("Invalid email or password");
        toast.error("Invalid email or password");
        return;
      }
      router.prefetch(postLoginRedirect);
      router.push(postLoginRedirect);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AuthView
        mode="login"
        name=""
        email={email}
        password={password}
        onNameChange={() => {}}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        error={error}
        submitting={submitting}
        onSubmit={onSubmit}
        forgotPasswordHref="/forgot-password"
        showModeSwitch={false}
        renderLink={({ href, className, children }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
        renderForgotPasswordLink={({ href, className, children }) => (
          <Link href={href} className={className}>
            {children}
          </Link>
        )}
      />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Private beta — not launched yet.{" "}
        <a href={CONTACT_MAILTO} className="font-medium text-foreground hover:underline">
          Email {CONTACT_EMAIL}
        </a>{" "}
        for access.
      </p>
    </>
  );
}
