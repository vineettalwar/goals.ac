import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import {
  Loader2, ExternalLink, Save, Globe, AlertCircle, RefreshCw, CheckCircle2, Palette, Zap,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { PublishingSettingsPanel } from "@/components/publishing-settings-panel";
import { hasAnyPublishingConnection, countPublishingConnections } from "@/lib/publishing-destinations";
import { VoiceStringListField } from "./project-detail-voice-string-list-field";
import { ProjectDetailWritingExamples } from "./project-detail-writing-examples";
import {
  TONE_PRESETS, READING_LEVELS, LANGUAGES, WORD_COUNT_PRESETS,
  TIMEZONE_OPTIONS, RUN_HOUR_OPTIONS, API_BASE,
} from "./project-detail-constants";

export function ProjectDetailPublishingTab({ ctx }: { ctx: Record<string, unknown> }) {
  const {
    id, token, cmsIntegrations, healthStatus, cmsError, cmsSaveSuccess, pendingAction, metaPageToken, metaPages,
    autopilotSettings, visibilitySettings, isSavingAutopilot, autopilotSaveSuccess, autopilotError,
    isSavingVisibility, visibilitySaveSuccess, setAutopilotSettings, setVisibilitySettings,
    setCmsIntegrations, setHealthStatus, setCmsError, setCmsSaveSuccess,
    onSaveAutopilot, onSaveVisibility, onTestHealth, onConnectOAuth, onDisconnectSocial, onSelectMetaPage,
  } = ctx as never;

  return (
    <TabsContent value="publishing">
                  <div className="space-y-6">
                    <Card className="border shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Zap className="w-4 h-4 text-amber-500" />
                          Content Autopilot
                          {autopilotSettings.enabled && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                              Active
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Automatically generate the next due article from your content strategy on a daily or weekly schedule.
                          Connect a CMS below to publish drafts or go live.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {autopilotError && (
                          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-4 py-3">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{autopilotError}</span>
                          </div>
                        )}
                        {autopilotSaveSuccess && (
                          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-4 py-3 border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Autopilot settings saved</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">Enable autopilot</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Picks the next due topic from your content strategy calendar
                            </p>
                          </div>
                          <Switch
                            checked={autopilotSettings.enabled}
                            onCheckedChange={(checked) =>
                              setAutopilotSettings((prev) => ({ ...prev, enabled: checked }))
                            }
                          />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Schedule</Label>
                            <Select
                              value={autopilotSettings.cadence}
                              onValueChange={(value: "daily" | "weekly") =>
                                setAutopilotSettings((prev) => ({ ...prev, cadence: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily (one article per day)</SelectItem>
                                <SelectItem value="weekly">Weekly (one article per week)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Publish mode</Label>
                            <Select
                              value={autopilotSettings.publishMode}
                              onValueChange={(value: AutopilotSettings["publishMode"]) =>
                                setAutopilotSettings((prev) => ({ ...prev, publishMode: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Manual review (generate only)</SelectItem>
                                <SelectItem value="draft">Auto-publish as draft</SelectItem>
                                <SelectItem value="live">Auto-publish live</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Timezone</Label>
                            <Select
                              value={autopilotSettings.timezone}
                              onValueChange={(value) =>
                                setAutopilotSettings((prev) => ({ ...prev, timezone: value }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIMEZONE_OPTIONS.map((tz) => (
                                  <SelectItem key={tz} value={tz}>
                                    {tz.replace(/_/g, " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Run at (local time)</Label>
                            <Select
                              value={String(autopilotSettings.preferredRunHour)}
                              onValueChange={(value) =>
                                setAutopilotSettings((prev) => ({
                                  ...prev,
                                  preferredRunHour: Number(value),
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RUN_HOUR_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={String(opt.value)}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">Auto-queue keyword opportunities</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              High-score keyword gaps added to your content strategy calendar
                            </p>
                          </div>
                          <Switch
                            checked={autopilotSettings.autoQueueOpportunities ?? false}
                            onCheckedChange={(checked) =>
                              setAutopilotSettings((prev) => ({ ...prev, autoQueueOpportunities: checked }))
                            }
                          />
                        </div>
                        {(autopilotSettings.autoQueueOpportunities ?? false) && (
                          <div className="space-y-2">
                            <Label>Minimum opportunity score to auto-queue</Label>
                            <Select
                              value={String(autopilotSettings.opportunityScoreThreshold ?? 60)}
                              onValueChange={(value) =>
                                setAutopilotSettings((prev) => ({
                                  ...prev,
                                  opportunityScoreThreshold: Number(value),
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="50">50 (moderate opportunities)</SelectItem>
                                <SelectItem value="60">60 (recommended)</SelectItem>
                                <SelectItem value="70">70 (high confidence only)</SelectItem>
                                <SelectItem value="80">80 (very selective)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {autopilotSettings.lastRunAt && (
                          <p className="text-xs text-muted-foreground">
                            Last run: {new Date(autopilotSettings.lastRunAt).toLocaleString()}
                          </p>
                        )}
                        <div className="flex justify-end">
                          <Button onClick={onSaveAutopilot} disabled={isSavingAutopilot}>
                            {isSavingAutopilot ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Save autopilot settings
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
      
                    <Card className="border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">AI Visibility & GEO</CardTitle>
                        <CardDescription>
                          Weekly LLM citation tracking and GEO re-audits.{" "}
                          <Link to="/ai-visibility" className="text-blue-600 dark:text-blue-400 hover:underline">
                            view full dashboard
                          </Link>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {visibilitySaveSuccess && (
                          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-md px-4 py-3 border border-emerald-200 dark:border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Visibility settings saved</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">LLM citation tracking</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Weekly checks across ChatGPT, Perplexity, Claude, Gemini</p>
                          </div>
                          <Switch
                            checked={visibilitySettings.llmTrackingEnabled}
                            onCheckedChange={(checked) =>
                              setVisibilitySettings((prev) => ({ ...prev, llmTrackingEnabled: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">Weekly GEO re-audit</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Re-scan homepage for schema and meta issues</p>
                          </div>
                          <Switch
                            checked={visibilitySettings.geoReauditEnabled}
                            onCheckedChange={(checked) =>
                              setVisibilitySettings((prev) => ({ ...prev, geoReauditEnabled: checked }))
                            }
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button onClick={onSaveVisibility} disabled={isSavingVisibility} variant="outline">
                            {isSavingVisibility ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            Save visibility settings
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
      
                    <PublishingSettingsPanel
                      apiBase={API_BASE}
                      projectId={id!}
                      token={token!}
                      cmsIntegrations={cmsIntegrations}
                      healthStatus={healthStatus}
                      cmsError={cmsError}
                      cmsSaveSuccess={cmsSaveSuccess}
                      isTestingHealth={isTestingHealth}
                      metaPageToken={metaPageToken}
                      metaPages={metaPages}
                      isSelectingMetaPage={isSelectingMetaPage}
                      isDisconnectingLinkedin={isDisconnectingLinkedin}
                      isDisconnectingTwitter={isDisconnectingTwitter}
                      isDisconnectingMeta={isDisconnectingMeta}
                      onIntegrationsChange={setCmsIntegrations}
                      onHealthKeyRemove={(key) =>
                        setHealthStatus((prev) => {
                          if (!prev) return prev;
                          const next = { ...prev };
                          delete next[key];
                          return next;
                        })
                      }
                      onError={setCmsError}
                      onSaveSuccess={(message) => {
                        setCmsSaveSuccess(message);
                        setTimeout(() => setCmsSaveSuccess(null), 3000);
                      }}
                      onTestHealth={onTestHealth}
                      onConnectOAuth={onConnectOAuth}
                      onDisconnectSocial={onDisconnectSocial}
                      onSelectMetaPage={onSelectMetaPage}
                    />
                  </div>
    </TabsContent>
  );
}
