"use client";

import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AuthView } from "@workspace/app-shell";
import {
  CONTACT_CTA_LABEL,
  CONTACT_EMAIL,
  CONTACT_HREF,
} from "@/lib/marketing/site/marketing-contact";

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
    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setSubmitting(false);
    if (result?.error) {
      setError("Invalid email or password");
      toast.error("Invalid email or password");
    } else {
      router.prefetch(postLoginRedirect);
      router.push(postLoginRedirect);
      router.refresh();
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
        Need access?{" "}
        <Link href={CONTACT_HREF} className="font-medium text-foreground hover:underline">
          {CONTACT_CTA_LABEL}
        </Link>
        {" "}or email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </>
  );
}
