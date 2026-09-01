"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { ConnectWordPressForms } from "../connect-wordpress-forms";
import type { OnboardingAnswers } from "@workspace/db/schema/onboarding_sessions";

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
type TestResult = { ok: boolean; siteName?: string; error?: string } | null;

/**
 * Credential testing reuses the existing `/api/wordpress/test` endpoint (already
 * used by the legacy /onboarding/connect page, see connect-wordpress-forms.tsx).
 * GUESS: the fixed API contract does not name a dedicated "save WordPress
 * credentials" route for onboarding, so this step round-trips only `mode` and
 * `siteUrl` through the onboarding session PATCH, same as the other connect
 * steps. Persisting the tested credentials against the org's website project is
 * expected to happen server-side (session completion, or a route S3/S6 adds).
 */
export function WordpressStep({
  answer,
  onResolved,
}: {
  answer: OnboardingAnswers["wordpress"];
  onResolved: (value: OnboardingAnswers["wordpress"]) => void;
}) {
  const [connectionMethod, setConnectionMethod] = useState<"plugin" | "api">("plugin");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);

  const apiForm = useForm<ApiFormData>({ resolver: zodResolver(apiSchema) });
  const pluginForm = useForm<PluginFormData>({ resolver: zodResolver(pluginSchema) });

  if (answer?.mode === "plugin" || answer?.mode === "app_password" || answer?.mode === "skipped") {
    return (
      <div className="paper-card px-5 py-4 text-foreground">
        {answer.mode === "skipped" ? "WordPress skipped" : `WordPress connected${answer.siteUrl ? `, ${answer.siteUrl}` : ""}`}
      </div>
    );
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const values = connectionMethod === "api" ? apiForm.getValues() : pluginForm.getValues();
    const body =
      connectionMethod === "api"
        ? { connectionType: "api", ...values }
        : { connectionType: "plugin", ...values };
    try {
      const res = await fetch("/api/wordpress/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await res.json()) as TestResult;
      setTestResult(result);
    } catch {
      setTestResult({ ok: false, error: "Could not reach that site." });
    } finally {
      setTesting(false);
    }
  }

  function submitPlugin(data: PluginFormData) {
    onResolved({ mode: "plugin", siteUrl: data.siteUrl });
  }
  function submitApi(data: ApiFormData) {
    onResolved({ mode: "app_password", siteUrl: data.siteUrl });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-lg border border-border p-1">
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
                : "text-muted-foreground hover:text-foreground"
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
        saving={false}
        onTest={handleTest}
        onSkip={() => onResolved({ mode: "skipped" })}
        onSubmitPlugin={submitPlugin}
        onSubmitApi={submitApi}
      />
    </div>
  );
}
