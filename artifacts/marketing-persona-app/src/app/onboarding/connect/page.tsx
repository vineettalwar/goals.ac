"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StepIndicator } from "@/components/onboarding/step-indicator";
import { ConnectWordPressForms } from "@/components/onboarding/connect-wordpress-forms";
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

        <ConnectWordPressForms
          connectionMethod={connectionMethod}
          pluginForm={pluginForm}
          apiForm={apiForm}
          testResult={testResult}
          testing={testing}
          saving={saving}
          onTest={handleTest}
          onSkip={handleSkip}
          onSubmitPlugin={onSubmitPlugin}
          onSubmitApi={onSubmitApi}
        />
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
