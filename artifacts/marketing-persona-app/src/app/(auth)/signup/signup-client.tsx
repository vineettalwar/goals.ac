"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { buildAuthRedirectParams } from "@/lib/projects/roadmap-intent";
import { useRoadmapIntent } from "@/hooks/use-roadmap-intent";
import {
  CONTACT_CTA_PRIMARY,
  CONTACT_EMAIL,
  CONTACT_HREF,
  CONTACT_MAILTO,
} from "@/lib/marketing/marketing-contact";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

interface SignupPageClientProps {
  signupsEnabled: boolean;
}

export function SignupPageClient({ signupsEnabled }: SignupPageClientProps) {
  return (
    <Suspense fallback={<div className="paper-card p-8 animate-pulse h-96 rounded-xl bg-secondary/40" />}>
      <SignupPageContent signupsEnabled={signupsEnabled} />
    </Suspense>
  );
}

function InviteOnlyMessage() {
  return (
    <div className="paper-card p-8 text-center">
      <h1 className="text-2xl font-bold">Invite only</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        goals.ac is available to clients by invitation. Interested in SEO, AEO, or GEO consulting?
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link href={CONTACT_HREF}>{CONTACT_CTA_PRIMARY}</Link>
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

function SignupPageContent({ signupsEnabled }: SignupPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roadmapIntent = useRoadmapIntent();
  const signupReferrer = searchParams.get("from")?.trim() || roadmapIntent?.referrer;
  const inviteToken = searchParams.get("token")?.trim() || undefined;
  const inviteEmail = searchParams.get("email")?.trim() || undefined;
  const callbackUrl = searchParams.get("callbackUrl")?.trim();
  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : `/login?${buildAuthRedirectParams(signupReferrer).toString()}`;
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: inviteEmail ?? "",
    },
  });

  const canSignup = signupsEnabled || Boolean(inviteToken);

  if (!canSignup) {
    return <InviteOnlyMessage />;
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        referrer: signupReferrer,
        inviteToken,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Signup failed" }));
      toast.error(error ?? "Signup failed");
      setLoading(false);
      return;
    }

    const signupBody = (await res.json()) as { organizationId?: number | null };

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
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
    <div className="paper-card p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {inviteToken
            ? "Create your account to accept your team invitation."
            : "Create your goals.ac account to get started."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" autoComplete="name" placeholder="Alex Johnson" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            readOnly={Boolean(inviteEmail)}
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="border-white/30 border-t-white" />
              <span className="sr-only">Creating account…</span>
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
