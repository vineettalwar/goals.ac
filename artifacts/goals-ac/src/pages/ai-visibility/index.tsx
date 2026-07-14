import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/app-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/use-auth";
import { useActiveProject } from "@/context/use-active-project";
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { AiVisibilitySummary } from "./ai-visibility-summary";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface VisibilitySettings {
  llmTrackingEnabled: boolean;
  geoReauditEnabled: boolean;
  lastVisibilityCheckAt?: string;
  lastGeoReauditAt?: string;
}

interface VisibilitySummary {
  settings: VisibilitySettings;
  visibilityScore: number;
  promptCount: number;
  trend: Array<{ date: string; score: number; cited: number; total: number }>;
  byEngine: Array<{ engine: string; cited: number; total: number; score: number }>;
  competitorMentions: Array<{ name: string; count: number }>;
  geoScoreTrend: Array<{ date: string; score: number }>;
  latestGeoScore: number | null;
  recentSnapshots: Array<{ id: number; prompt: string; engine: string; cited: boolean; competitorsMentioned: string[]; checkedAt: string }>;
}

export default function AiVisibility() {
  const { token } = useAuth();
  const { activeProjectId } = useActiveProject();
  const [summary, setSummary] = useState<VisibilitySummary | null>(null);
  const [settings, setSettings] = useState<VisibilitySettings>({
    llmTrackingEnabled: false,
    geoReauditEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !activeProjectId) {
      setSummary(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [settingsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/api/website-projects/${activeProjectId}/visibility-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/website-projects/${activeProjectId}/visibility`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (settingsRes.ok) {
        setSettings((await settingsRes.json()) as VisibilitySettings);
      }
      if (summaryRes.ok) {
        setSummary((await summaryRes.json()) as VisibilitySummary);
      } else {
        setSummary(null);
      }
    } catch {
      setError("Failed to load visibility data");
    } finally {
      setIsLoading(false);
    }
  }, [token, activeProjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (next: VisibilitySettings) => {
    if (!token || !activeProjectId) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${activeProjectId}/visibility-settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        setError("Failed to save settings");
        return;
      }
      const saved = (await res.json()) as VisibilitySettings;
      setSettings(saved);

      if (saved.llmTrackingEnabled && (summary?.promptCount ?? 0) === 0) {
        await fetch(`${API_BASE}/api/website-projects/${activeProjectId}/visibility/seed-prompts`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await load();
    } finally {
      setIsSaving(false);
    }
  };

  const runCheckNow = async () => {
    if (!token || !activeProjectId) return;
    setIsChecking(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/website-projects/${activeProjectId}/visibility/check-now`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` },
        body: JSON.stringify({ async: true }),
      });
      if (!res.ok) {
        setError("Failed to queue visibility check");
        return;
      }
      setTimeout(() => load(), 3000);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <AppLayout>
      <SEO
        title="AI Visibility Tracking | goals.ac"
        description="Track how often your brand is cited across AI search engines — ChatGPT, Perplexity, Claude, and Gemini."
      />
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AI Visibility</h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              Track whether AI engines cite your brand when users ask questions in your niche.
              Runs weekly when enabled — or check now.
            </p>
          </div>
          {activeProjectId && (
            <Button onClick={runCheckNow} disabled={isChecking || isLoading} variant="outline" className="shrink-0">
              {isChecking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Check now
            </Button>
          )}
        </div>

        {!activeProjectId && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Select a project from the dashboard to track AI visibility.
            </CardContent>
          </Card>
        )}

        {activeProjectId && (
          <>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tracking settings</CardTitle>
                <CardDescription>Enable weekly automated checks for this project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                  <div>
                    <Label>LLM citation tracking</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Weekly checks across ChatGPT, Perplexity, Claude, and Gemini-style answers
                    </p>
                  </div>
                  <Switch
                    checked={settings.llmTrackingEnabled}
                    disabled={isSaving}
                    onCheckedChange={(checked) => {
                      const next = { ...settings, llmTrackingEnabled: checked };
                      setSettings(next);
                      saveSettings(next);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                  <div>
                    <Label>Weekly GEO re-audit</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Re-run technical GEO audit on your homepage every Sunday
                    </p>
                  </div>
                  <Switch
                    checked={settings.geoReauditEnabled}
                    disabled={isSaving}
                    onCheckedChange={(checked) => {
                      const next = { ...settings, geoReauditEnabled: checked };
                      setSettings(next);
                      saveSettings(next);
                    }}
                  />
                </div>
                {settings.lastVisibilityCheckAt && (
                  <p className="text-xs text-muted-foreground">
                    Last visibility check: {new Date(settings.lastVisibilityCheckAt).toLocaleString()}
                  </p>
                )}
                {settings.lastGeoReauditAt && (
                  <p className="text-xs text-muted-foreground">
                    Last GEO re-audit: {new Date(settings.lastGeoReauditAt).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : summary ? (
              <AiVisibilitySummary summary={summary} activeProjectId={activeProjectId} />
            ) : null}
          </>
        )}
      </div>
    </AppLayout>
  );
}
