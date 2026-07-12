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
import { buildAuthRedirectParams, resolvePostLoginRedirect } from "@/lib/roadmap-intent";
import { useRoadmapIntent } from "@/hooks/use-roadmap-intent";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="paper-card p-8 animate-pulse h-80 rounded-xl bg-secondary/40" />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const roadmapIntent = useRoadmapIntent();
  const signupReferrer = searchParams.get("from")?.trim() || roadmapIntent?.referrer;
  const signupHref = `/signup?${buildAuthRedirectParams(signupReferrer).toString()}`;
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
      const destination = resolvePostLoginRedirect(next);
      router.prefetch(destination);
      router.push(destination);
      router.refresh();
    }
  }

  return (
    <div className="paper-card p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {roadmapIntent
            ? `Sign in to generate your ${roadmapIntent.industry} roadmap for ${roadmapIntent.location}.`
            : "Welcome back"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner size="sm" className="border-white/30 border-t-white" /> : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href={signupHref} className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
