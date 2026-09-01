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
 * Credential testing reuses `/api/wordpress/test`, and saving reuses
 * `PATCH /api/website-projects/[id]/cms-integrations` — the same route the legacy
 * connect page used, which encrypts the credentials at rest.
 *
 * The onboarding session only ever carries `mode` and `siteUrl`. The username,
 * application password and site key go straight to the project's encrypted
 * integrations and never touch `onboarding_sessions.answers`, which is a plain
 * jsonb column that gets read back in full on every step.
 */
export function WordpressStep({
  answer,
  websiteProjectId,
  onResolved,
}: {
  answer: OnboardingAnswers["wordpress"];
  websiteProjectId: number | null;
  onResolved: (value: OnboardingAnswers["wordpress"]) => void;
}) {
  const [connectionMethod, setConnectionMethod] = useState<"plugin" | "api">("plugin");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  /**
   * Saves before advancing. A step that advanced on a green test but a failed save
   * would tell the firm WordPress was connected while publishing had no credentials
   * to use, and they would only find out when their first article failed to publish.
   */
  async function saveConnection(
    payload: Record<string, unknown>,
    resolved: NonNullable<OnboardingAnswers["wordpress"]>,
  ) {
    if (websiteProjectId == null) {
      setSaveError("We could not find your site yet. Go back a step and confirm your website address.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/website-projects/${websiteProjectId}/cms-integrations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordpress: payload }),
      });
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveError(error ?? "We tested the connection but could not save it. Try again.");
        return;
      }
      onResolved(resolved);
    } catch {
      setSaveError("We tested the connection but could not save it. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function submitPlugin(data: PluginFormData) {
    void saveConnection(
      { connectionType: "plugin", siteUrl: data.siteUrl, siteKey: data.siteKey },
      { mode: "plugin", siteUrl: data.siteUrl },
    );
  }
  function submitApi(data: ApiFormData) {
    void saveConnection(
      {
        connectionType: "api",
        siteUrl: data.siteUrl,
        username: data.username,
        appPassword: data.appPassword,
      },
      { mode: "app_password", siteUrl: data.siteUrl },
    );
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
      {saveError ? (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      ) : null}
      <ConnectWordPressForms
        connectionMethod={connectionMethod}
        pluginForm={pluginForm}
        apiForm={apiForm}
        testResult={testResult}
        testing={testing}
        saving={saving}
        onTest={handleTest}
        onSkip={() => onResolved({ mode: "skipped" })}
        onSubmitPlugin={submitPlugin}
        onSubmitApi={submitApi}
      />
    </div>
  );
}
