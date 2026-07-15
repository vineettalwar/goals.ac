import { Loader2 } from "lucide-react";
import { cn } from "../cn";
import { SOCIAL_PLATFORM_OPTIONS, WEEK_DAY_LABELS, type ScheduleSettings } from "./types";

export function SocialSettingsPanel({
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
  if (settingsLoading && !settings) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading settings…
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="paper-card space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold">Posting schedule</h3>
        <p className="text-sm text-muted-foreground">
          Buffer-style slots per platform. Posts require approval when enabled.
        </p>
      </div>

      <div className="grid max-w-xs gap-2">
        <label htmlFor="social-hub-timezone" className="text-sm font-medium">
          Timezone
        </label>
        <input
          id="social-hub-timezone"
          className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
          value={settings.timezone}
          onChange={(event) => onSettingsChange({ ...settings, timezone: event.target.value })}
        />
      </div>

      <div className="grid max-w-xs gap-2">
        <label htmlFor="social-hub-best-time-mode" className="text-sm font-medium">
          Best time mode
        </label>
        <select
          id="social-hub-best-time-mode"
          className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm"
          value={settings.bestTimeMode}
          onChange={(event) => onSettingsChange({ ...settings, bestTimeMode: event.target.value })}
        >
          <option value="manual">Manual slots only</option>
          <option value="suggested">Suggested slots</option>
          <option value="analytics">Analytics-driven (sync metrics first)</option>
        </select>
        {settings.bestTimeMode === "analytics" ? (
          <p className="text-xs text-muted-foreground">
            Uses engagement from the Analytics tab to bias schedule suggestions.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {SOCIAL_PLATFORM_OPTIONS.map((platform) => {
          const cfg = settings.platforms[platform.id] ?? {};
          return (
            <div
              key={platform.id}
              className={cn(
                "space-y-2 rounded-lg border border-border p-3",
                cfg.enabled === false && "opacity-60",
              )}
            >
              <p className="text-sm font-medium">{platform.label}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cfg.enabled !== false}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        platforms: {
                          ...settings.platforms,
                          [platform.id]: { ...cfg, enabled: event.target.checked },
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
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        platforms: {
                          ...settings.platforms,
                          [platform.id]: { ...cfg, requireApproval: event.target.checked },
                        },
                      })
                    }
                  />
                  Require approval
                </label>
                <label className="flex items-center gap-2">
                  Posts/week
                  <input
                    type="number"
                    className="h-8 w-16 rounded-lg border border-input bg-card px-2 text-sm"
                    min={1}
                    max={14}
                    value={cfg.slotsPerWeek ?? 3}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        platforms: {
                          ...settings.platforms,
                          [platform.id]: {
                            ...cfg,
                            slotsPerWeek: Number(event.target.value) || 3,
                          },
                        },
                      })
                    }
                  />
                </label>
                <label className="flex items-center gap-2">
                  Min hours between
                  <input
                    type="number"
                    className="h-8 w-16 rounded-lg border border-input bg-card px-2 text-sm"
                    min={1}
                    max={168}
                    value={cfg.minHoursBetweenPosts ?? 24}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        platforms: {
                          ...settings.platforms,
                          [platform.id]: {
                            ...cfg,
                            minHoursBetweenPosts: Number(event.target.value) || 24,
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
                    <label
                      key={label}
                      className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={(cfg.preferredDays ?? [1, 3, 5]).includes(dow)}
                        onChange={(event) => {
                          const current = cfg.preferredDays ?? [1, 3, 5];
                          const next = event.target.checked
                            ? [...current, dow].sort()
                            : current.filter((day) => day !== dow);
                          onSettingsChange({
                            ...settings,
                            platforms: {
                              ...settings.platforms,
                              [platform.id]: { ...cfg, preferredDays: next },
                            },
                          });
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid max-w-xs gap-1">
                <label
                  htmlFor={`social-hub-preferred-times-${platform.id}`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Preferred times (HH:MM)
                </label>
                <input
                  id={`social-hub-preferred-times-${platform.id}`}
                  className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                  value={(cfg.preferredTimes ?? ["09:00"]).join(", ")}
                  onChange={(event) =>
                    onSettingsChange({
                      ...settings,
                      platforms: {
                        ...settings.platforms,
                        [platform.id]: {
                          ...cfg,
                          preferredTimes: event.target.value
                            .split(",")
                            .map((time) => time.trim())
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

      <button
        type="button"
        disabled={settingsLoading}
        onClick={() => void onSaveSettings()}
        className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50"
      >
        Save settings
      </button>
    </div>
  );
}
