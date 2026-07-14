"use client";

import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type TestResult = { ok: boolean; siteName?: string; error?: string } | null;

type PluginFormData = {
  siteUrl: string;
  siteKey: string;
};

type ApiFormData = {
  siteUrl: string;
  username: string;
  appPassword: string;
};

function ConnectionTestResult({
  testResult,
  variant,
}: {
  testResult: TestResult;
  variant: "plugin" | "api";
}) {
  if (!testResult) return null;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}
    >
      {testResult.ok ? (
        <>
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {variant === "plugin" ? (
            <>Plugin connected{testResult.siteName ? ` (v${testResult.siteName})` : ""}</>
          ) : (
            <>Connected as {testResult.siteName}</>
          )}
        </>
      ) : (
        <>
          <XCircle className="h-4 w-4 shrink-0" /> {testResult.error}
        </>
      )}
    </div>
  );
}

export function ConnectWordPressForms({
  connectionMethod,
  pluginForm,
  apiForm,
  testResult,
  testing,
  saving,
  onTest,
  onSkip,
  onSubmitPlugin,
  onSubmitApi,
}: {
  connectionMethod: "plugin" | "api";
  pluginForm: UseFormReturn<PluginFormData>;
  apiForm: UseFormReturn<ApiFormData>;
  testResult: TestResult;
  testing: boolean;
  saving: boolean;
  onTest: () => void;
  onSkip: () => void;
  onSubmitPlugin: (data: PluginFormData) => void;
  onSubmitApi: (data: ApiFormData) => void;
}) {
  if (connectionMethod === "plugin") {
    return (
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

          <ConnectionTestResult testResult={testResult} variant="plugin" />

          <Button type="button" variant="outline" onClick={onTest} disabled={testing} className="w-full">
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
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Saving..." : "Complete setup →"}
          </Button>
        </div>
      </form>
    );
  }

  return (
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

        <ConnectionTestResult testResult={testResult} variant="api" />

        <Button type="button" variant="outline" onClick={onTest} disabled={testing} className="w-full">
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
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip for now
        </button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving..." : "Complete setup →"}
        </Button>
      </div>
    </form>
  );
}
