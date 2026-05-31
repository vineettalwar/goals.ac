"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const schema = z.object({
  siteUrl: z.string().url("Enter a valid URL"),
  username: z.string().min(1),
  appPassword: z.string().min(1),
  defaultStatus: z.enum(["draft", "publish"]),
});
type FormData = z.infer<typeof schema>;

export default function AutopilotSettingsPage() {
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; siteName?: string; error?: string } | null>(null);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { defaultStatus: "draft" },
  });

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then(({ companies }) => {
        if (companies?.[0]) setCompanyId(companies[0].id);
      });
  }, []);

  async function handleTest() {
    const values = getValues();
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/wordpress/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteUrl: values.siteUrl, username: values.username, appPassword: values.appPassword }),
    });
    setTestResult(await res.json());
    setTesting(false);
  }

  async function onSubmit(data: FormData) {
    if (!companyId) return;
    setSaving(true);
    const res = await fetch("/api/wordpress/test?action=save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, companyId }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to save connection");
      return;
    }
    toast.success("WordPress connection saved");
  }

  return (
    <div className="px-8 py-8 max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Autopilot settings</h1>

      <div className="paper-card p-8 space-y-5">
        <h2 className="font-semibold">WordPress connection</h2>

        <div className="space-y-1.5">
          <Label htmlFor="siteUrl">Site URL</Label>
          <Input id="siteUrl" placeholder="https://yourblog.com" {...register("siteUrl")} />
          {errors.siteUrl && <p className="text-xs text-destructive">{errors.siteUrl.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" placeholder="admin" {...register("username")} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="appPassword">Application password</Label>
            <a
              href="https://wordpress.org/documentation/article/application-passwords/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              How to create <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <Input id="appPassword" type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" {...register("appPassword")} />
        </div>

        <div className="space-y-1.5">
          <Label>Publish articles as</Label>
          <div className="flex gap-4">
            {(["draft", "publish"] as const).map((val) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" value={val} {...register("defaultStatus")} className="accent-primary" />
                <span className="capitalize">{val === "draft" ? "Draft (review first)" : "Published (live immediately)"}</span>
              </label>
            ))}
          </div>
        </div>

        {testResult && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${testResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            {testResult.ok
              ? <><CheckCircle2 className="h-4 w-4 shrink-0" /> Connected as {testResult.siteName}</>
              : <><XCircle className="h-4 w-4 shrink-0" /> {testResult.error}</>}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="flex-1">
            {testing ? <><Spinner size="sm" /> Testing...</> : "Test connection"}
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save connection"}
          </Button>
        </div>
      </div>
    </div>
  );
}
