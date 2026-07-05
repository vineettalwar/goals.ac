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
import { Textarea } from "@/components/ui/textarea";

const HUMANIZATION_LEVELS = [
  { value: "off", label: "Off", description: "Publish the raw AI draft with no rewrite pass." },
  { value: "light", label: "Light", description: "Polish rhythm and word choice so the draft reads naturally." },
  { value: "strong", label: "Strong", description: "Fully rewrite the voice for a distinctly human read." },
] as const;

type HumanizationLevel = (typeof HUMANIZATION_LEVELS)[number]["value"];

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
  const [humanizationLevel, setHumanizationLevel] = useState<HumanizationLevel>("light");
  const [writingSample, setWritingSample] = useState("");
  const [savingHumanization, setSavingHumanization] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { defaultStatus: "draft" },
  });

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then(({ companies }) => {
        if (companies?.[0]) {
          setCompanyId(companies[0].id);
          if (companies[0].humanizationLevel) setHumanizationLevel(companies[0].humanizationLevel);
          setWritingSample(companies[0].writingSample ?? "");
        }
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

  async function saveHumanization() {
    if (!companyId) return;
    setSavingHumanization(true);
    const res = await fetch("/api/companies/humanization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, humanizationLevel, writingSample: writingSample || null }),
    });
    setSavingHumanization(false);
    if (!res.ok) {
      toast.error("Failed to save humanization settings");
      return;
    }
    toast.success("Humanization settings saved");
  }

  return (
    <div className="px-8 py-8 max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Autopilot settings</h1>

      {/* Article humanization */}
      <div className="paper-card p-8 space-y-5">
        <div className="space-y-1">
          <h2 className="font-semibold">Article humanization</h2>
          <p className="text-sm text-muted-foreground">
            A second AI pass rewrites each article so it reads like a human wrote it — headings, keywords, and citations are preserved.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Intensity</Label>
          <div className="space-y-2">
            {HUMANIZATION_LEVELS.map((level) => (
              <label key={level.value} className="flex items-start gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="humanizationLevel"
                  value={level.value}
                  checked={humanizationLevel === level.value}
                  onChange={() => setHumanizationLevel(level.value)}
                  className="accent-primary mt-0.5"
                />
                <span>
                  <span className="font-medium">{level.label}</span>
                  <span className="text-muted-foreground"> — {level.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="writingSample">Writing sample (optional)</Label>
          <Textarea
            id="writingSample"
            rows={6}
            className="min-h-[140px]"
            placeholder="Paste a few paragraphs you've written. The humanizer will mimic your cadence and word choice."
            value={writingSample}
            onChange={(e) => setWritingSample(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Used only to match your voice — its content never appears in articles.
          </p>
        </div>

        <Button onClick={saveHumanization} disabled={savingHumanization || !companyId}>
          {savingHumanization ? "Saving..." : "Save humanization settings"}
        </Button>
      </div>

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
