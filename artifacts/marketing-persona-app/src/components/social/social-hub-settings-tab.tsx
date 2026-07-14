"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PLATFORMS, WEEK_DAY_LABELS, type ScheduleSettings } from "./social-hub-types";

export function SocialHubSettingsTab({
  settings,
  settingsLoading,
  onSettingsChange,
  onSaveSettings,
}: {
  settings: ScheduleSettings | null;
  settingsLoading: boolean;
  onSettingsChange: (settings: ScheduleSettings) => void;
  onSaveSettings: () => void;
}) {
  return (
        <TabsContent value="settings" className="space-y-4 mt-4">
          {settingsLoading && !settings ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings…
            </div>
          ) : settings ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Posting schedule</CardTitle>
                <CardDescription>
                  Buffer-style slots per platform. Posts require approval when enabled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 max-w-xs">
                  <label htmlFor="social-hub-timezone" className="text-sm font-medium">Timezone</label>
                  <Input
                    id="social-hub-timezone"
                    value={settings.timezone}
                    onChange={(e) => onSettingsChange({ ...settings, timezone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2 max-w-xs">
                  <label htmlFor="social-hub-best-time-mode" className="text-sm font-medium">Best time mode</label>
                  <Select
                    value={settings.bestTimeMode}
                    onValueChange={(v) => onSettingsChange({ ...settings, bestTimeMode: v })}
                  >
                    <SelectTrigger id="social-hub-best-time-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual slots only</SelectItem>
                      <SelectItem value="suggested">Suggested slots</SelectItem>
                      <SelectItem value="analytics">Analytics-driven (sync metrics first)</SelectItem>
                    </SelectContent>
                  </Select>
                  {settings.bestTimeMode === "analytics" && (
                    <p className="text-xs text-muted-foreground">
                      Uses engagement from the Analytics tab to bias schedule suggestions.
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {PLATFORMS.map((p) => {
                    const cfg = settings.platforms[p.id] ?? {};
                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "rounded-lg border p-3 space-y-2",
                          cfg.enabled === false && "opacity-60",
                        )}
                      >
                        <p className="font-medium text-sm">{p.label}</p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={cfg.enabled !== false}
                              onChange={(e) =>
                                onSettingsChange({
                                  ...settings,
                                  platforms: {
                                    ...settings.platforms,
                                    [p.id]: { ...cfg, enabled: e.target.checked },
                                  },
                                })
                              }
                            />
                            Enabled
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={cfg.requireApproval === true}
                              onChange={(e) =>
                                onSettingsChange({
                                  ...settings,
                                  platforms: {
                                    ...settings.platforms,
                                    [p.id]: { ...cfg, requireApproval: e.target.checked },
                                  },
                                })
                              }
                            />
                            Require approval
                          </label>
                          <label className="flex items-center gap-2">
                            Posts/week
                            <Input
                              type="number"
                              className="w-16 h-8"
                              min={1}
                              max={14}
                              value={cfg.slotsPerWeek ?? 3}
                              onChange={(e) =>
                                onSettingsChange({
                                  ...settings,
                                  platforms: {
                                    ...settings.platforms,
                                    [p.id]: {
                                      ...cfg,
                                      slotsPerWeek: Number(e.target.value) || 3,
                                    },
                                  },
                                })
                              }
                            />
                          </label>
                          <label className="flex items-center gap-2">
                            Min hours between
                            <Input
                              type="number"
                              className="w-16 h-8"
                              min={1}
                              max={168}
                              value={cfg.minHoursBetweenPosts ?? 24}
                              onChange={(e) =>
                                onSettingsChange({
                                  ...settings,
                                  platforms: {
                                    ...settings.platforms,
                                    [p.id]: {
                                      ...cfg,
                                      minHoursBetweenPosts: Number(e.target.value) || 24,
                                    },
                                  },
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Preferred days</p>
                          <div className="flex flex-wrap gap-1">
                            {WEEK_DAY_LABELS.map((label, dow) => (
                              <label key={label} className="flex items-center gap-1 text-xs border rounded px-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={(cfg.preferredDays ?? [1, 3, 5]).includes(dow)}
                                  onChange={(e) => {
                                    const current = cfg.preferredDays ?? [1, 3, 5];
                                    const next = e.target.checked
                                      ? [...current, dow].sort()
                                      : current.filter((d) => d !== dow);
                                    onSettingsChange({
                                      ...settings,
                                      platforms: {
                                        ...settings.platforms,
                                        [p.id]: { ...cfg, preferredDays: next },
                                      },
                                    });
                                  }}
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-1 max-w-xs">
                          <label htmlFor={`social-hub-preferred-times-${p.id}`} className="text-xs font-medium text-muted-foreground">Preferred times (HH:MM)</label>
                          <Input
                            id={`social-hub-preferred-times-${p.id}`}
                            value={(cfg.preferredTimes ?? ["09:00"]).join(", ")}
                            onChange={(e) =>
                              onSettingsChange({
                                ...settings,
                                platforms: {
                                  ...settings.platforms,
                                  [p.id]: {
                                    ...cfg,
                                    preferredTimes: e.target.value
                                      .split(",")
                                      .map((t) => t.trim())
                                      .filter(Boolean),
                                  },
                                },
                              })
                            }
                            placeholder="09:00, 14:00"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button onClick={() => onSaveSettings()} disabled={settingsLoading}>
                  Save settings
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
  );
}
