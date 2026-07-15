"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useRoadmapIntent } from "@/hooks/use-roadmap-intent";
import { CONTACT_CTA_LABEL, CONTACT_EMAIL, CONTACT_HREF } from "@/lib/marketing/site/marketing-contact";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

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
  const roadmapIntent = useRoadmapIntent();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      toast.error("Invalid email or password");
    } else {
      router.prefetch(postLoginRedirect);
      router.push(postLoginRedirect);
      router.refresh();
    }
  }

  return (
    <div className="paper-card p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {roadmapIntent
            ? "Sign in to continue in the content studio."
            : "Welcome back"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="border-white/30 border-t-white" />
              <span className="sr-only">Signing in…</span>
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Need access?{" "}
        <Link href={CONTACT_HREF} className="font-medium text-foreground hover:underline">
          {CONTACT_CTA_LABEL}
        </Link>
        {" "}or email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}
