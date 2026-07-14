"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Leaf, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import {
  clearAutopilotIntent,
  postAutopilotCompleteRedirect,
} from "@/lib/projects/autopilot-intent";
import { cn } from "@/lib/utils";

type ConnectionMethod = "api" | "plugin";

const apiSchema = z.object({
  siteUrl: z.string().url("Enter a valid URL (include https://)"),
  username: z.string().min(1, "WordPress username is required"),
  appPassword: z.string().min(1, "Application password is required"),
});

const pluginSchema = z.object({
  siteUrl: z.string().url("Enter a valid URL (include https://)"),
  siteKey: z.string().min(1, "Site key is required"),
});

type ApiFormData = z.infer<typeof apiSchema>;
type PluginFormData = z.infer<typeof pluginSchema>;

function ConnectContent() {
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get("projectId");
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>("plugin");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; siteName?: string; error?: string } | null>(null);

  const apiForm = useForm<ApiFormData>({
    resolver: zodResolver(apiSchema),
  });

  const pluginForm = useForm<PluginFormData>({
    resolver: zodResolver(pluginSchema),
  });

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    if (connectionMethod === "api") {
      const values = apiForm.getValues();
      if (!values.siteUrl || !values.username || !values.appPassword) {
        toast.error("Fill in all fields before testing");
        setTesting(false);
        return;
      }
      const res = await fetch("/api/wordpress/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionType: "api",
          siteUrl: values.siteUrl,
          username: values.username,
          appPassword: values.appPassword,
        }),
      });
      const result = await res.json();
      setTestResult(result);
    } else {
      const values = pluginForm.getValues();
      if (!values.siteUrl || !values.siteKey) {
        toast.error("Fill in all fields before testing");
        setTesting(false);
        return;
      }
      const res = await fetch("/api/wordpress/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionType: "plugin",
          siteUrl: values.siteUrl,
          siteKey: values.siteKey,
        }),
      });
      const result = await res.json();
      setTestResult(result);
    }

    setTesting(false);
  }

  async function markOnboardingComplete() {
    const companiesRes = await fetch("/api/companies");
    if (!companiesRes.ok) return;
    const { companies } = (await companiesRes.json()) as { companies: Array<{ id: number }> };
    const companyId = companies[0]?.id;
    if (!companyId) return;
    await fetch("/api/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: companyId, data: { onboardingComplete: true } }),
    });
  }

  async function saveConnection(payload: Record<string, unknown>) {
    if (!projectId) return;
    setSaving(true);
    const res = await fetch(`/api/website-projects/${projectId}/cms-integrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordpress: payload }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to save" }));
      toast.error(error ?? "Failed to save connection");
      setSaving(false);
      return;
    }

    await markOnboardingComplete();
    clearAutopilotIntent();
    router.push(postAutopilotCompleteRedirect(Number(projectId)));
  }

  async function onSubmitApi(data: ApiFormData) {
    await saveConnection({
      connectionType: "api",
      siteUrl: data.siteUrl,
      username: data.username,
      appPassword: data.appPassword,
    });
  }

  async function onSubmitPlugin(data: PluginFormData) {
    await saveConnection({
      connectionType: "plugin",
      siteUrl: data.siteUrl,
      siteKey: data.siteKey,
    });
  }

  function handleSkip() {
    if (!projectId) return;
    markOnboardingComplete().then(() => {
      clearAutopilotIntent();
      router.push(postAutopilotCompleteRedirect(Number(projectId)));
    });
  }

  if (!projectId) {
    return <div className="flex min-h-screen items-center justify-center">Missing project</div>;
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
          <StepIndicator steps={["Website", "Content plan", "Articles", "Connect CMS"]} current={3} />
          <h1 className="mt-8 text-3xl font-bold">Connect WordPress</h1>
          <p className="mt-2 text-muted-foreground">
            Autopilot will publish drafts to your site for review. Use our plugin (recommended) or REST API credentials.
          </p>
        </div>

        <div className="mb-4 flex rounded-lg border border-border p-1">
          {(["plugin", "api"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => {
                setConnectionMethod(method);
                setTestResult(null);
              }}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                connectionMethod === method
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {method === "plugin" ? "Plugin + site key" : "REST API password"}
            </button>
          ))}
        </div>

        {connectionMethod === "plugin" ? (
          <form onSubmit={pluginForm.handleSubmit(onSubmitPlugin)}>
            <div className="paper-card p-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="plugin-siteUrl">WordPress site URL</Label>
                <Input id="plugin-siteUrl" placeholder="https://yourblog.com" {...pluginForm.register("siteUrl")} />
                {pluginForm.formState.errors.siteUrl && (
                  <p className="text-xs text-destructive">{pluginForm.formState.errors.siteUrl.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="siteKey">Site key</Label>
                  <a
                    href="https://wordpress.org/plugins/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Install goals.ac plugin <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  id="siteKey"
                  type="password"
                  placeholder="From plugin settings"
                  {...pluginForm.register("siteKey")}
                />
                <p className="text-xs text-muted-foreground">
                  Copy the site key from WordPress → Settings → goals.ac after installing the plugin.
                </p>
                {pluginForm.formState.errors.siteKey && (
                  <p className="text-xs text-destructive">{pluginForm.formState.errors.siteKey.message}</p>
                )}
              </div>

              {testResult && (
                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
                >
                  {testResult.ok ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0" /> Plugin connected
                      {testResult.siteName ? ` (v${testResult.siteName})` : ""}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 shrink-0" /> {testResult.error}
                    </>
                  )}
                </div>
              )}

              <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="w-full">
                {testing ? (
                  <>
                    <Spinner size="sm" /> Testing...
                  </>
                ) : (
                  "Test connection"
                )}
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
                {saving ? "Saving..." : "Complete setup →"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={apiForm.handleSubmit(onSubmitApi)}>
            <div className="paper-card p-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="api-siteUrl">WordPress site URL</Label>
                <Input id="api-siteUrl" placeholder="https://yourblog.com" {...apiForm.register("siteUrl")} />
                {apiForm.formState.errors.siteUrl && (
                  <p className="text-xs text-destructive">{apiForm.formState.errors.siteUrl.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">WordPress username</Label>
                <Input id="username" placeholder="admin" {...apiForm.register("username")} />
                {apiForm.formState.errors.username && (
                  <p className="text-xs text-destructive">{apiForm.formState.errors.username.message}</p>
                )}
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
                  placeholder="xxxx xxxx xxxx xxxx"
                  {...apiForm.register("appPassword")}
                />
                {apiForm.formState.errors.appPassword && (
                  <p className="text-xs text-destructive">{apiForm.formState.errors.appPassword.message}</p>
                )}
              </div>

              {testResult && (
                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
                >
                  {testResult.ok ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0" /> Connected as {testResult.siteName}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 shrink-0" /> {testResult.error}
                    </>
                  )}
                </div>
              )}

              <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="w-full">
                {testing ? (
                  <>
                    <Spinner size="sm" /> Testing...
                  </>
                ) : (
                  "Test connection"
                )}
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
                {saving ? "Saving..." : "Complete setup →"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ConnectContent />
    </Suspense>
  );
}
