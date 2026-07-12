"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { StepIndicator } from "@/components/step-indicator";

const schema = z.object({
  siteUrl: z.string().url("Enter a valid URL (include https://)"),
  username: z.string().min(1, "WordPress username is required"),
  appPassword: z.string().min(1, "Application password is required"),
  defaultStatus: z.enum(["draft", "publish"]),
});
type FormData = z.infer<typeof schema>;

function WordPressPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const companyId = params.get("companyId");

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; siteName?: string; error?: string } | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { defaultStatus: "draft" },
  });

  async function handleTest() {
    const values = getValues();
    if (!values.siteUrl || !values.username || !values.appPassword) {
      toast.error("Fill in all fields before testing");
      return;
    }
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/wordpress/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl: values.siteUrl, username: values.username, appPassword: values.appPassword }),
    });
    const result = await res.json();
    setTestResult(result);
    setTesting(false);
  }

  async function onSubmit(data: FormData) {
    if (!companyId) return;
    setSaving(true);
    const res = await fetch("/api/wordpress/test?action=save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, companyId: parseInt(companyId, 10) }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to save" }));
      toast.error(error ?? "Failed to save connection");
      setSaving(false);
      return;
    }

    // Mark onboarding complete
    await fetch("/api/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: parseInt(companyId, 10), data: { onboardingComplete: true } }),
    });

    router.push("/dashboard");
  }

  async function handleSkip() {
    if (!companyId) return;
    await fetch("/api/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: parseInt(companyId, 10), data: { onboardingComplete: true } }),
    });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">goals.ac</span>
          </div>
          <StepIndicator steps={["Company", "Personas", "WordPress"]} current={2} />
          <h1 className="mt-8 text-3xl font-bold">Connect WordPress</h1>
          <p className="mt-2 text-muted-foreground">
            Articles will be published directly to your WordPress site.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="paper-card p-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="siteUrl">WordPress site URL</Label>
              <Input id="siteUrl" placeholder="https://yourblog.com" {...register("siteUrl")} />
              {errors.siteUrl && <p className="text-xs text-destructive">{errors.siteUrl.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">WordPress username</Label>
              <Input id="username" placeholder="admin" {...register("username")} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="appPassword">Application password</Label>
                <a
                  href="https://wordpress.org/documentation/article/application-passwords/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  How to create one <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Input
                id="appPassword"
                type="password"
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                {...register("appPassword")}
              />
              {errors.appPassword && <p className="text-xs text-destructive">{errors.appPassword.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Publish articles as</Label>
              <div className="flex gap-4">
                {(["draft", "publish"] as const).map((val) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" value={val} {...register("defaultStatus")} className="accent-primary" />
                    <span className="text-sm capitalize">{val === "draft" ? "Draft (review first)" : "Published (live immediately)"}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Test connection feedback */}
            {testResult && (
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                {testResult.ok ? (
                  <><CheckCircle2 className="h-4 w-4 shrink-0" /> Connected as {testResult.siteName}</>
                ) : (
                  <><XCircle className="h-4 w-4 shrink-0" /> {testResult.error}</>
                )}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
              className="w-full"
            >
              {testing ? <><Spinner size="sm" /> Testing...</> : "Test connection"}
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
            <Button type="submit" size="lg" disabled={saving}>
              {saving ? "Setting up..." : "Complete setup →"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WordPressPageFallback() {
  return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
}

export default function WordPressPage() {
  return (
    <Suspense fallback={<WordPressPageFallback />}>
      <WordPressPageContent />
    </Suspense>
  );
}
