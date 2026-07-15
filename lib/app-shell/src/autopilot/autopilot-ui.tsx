import { Save, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../cn";
import {
  AUTOPILOT_CADENCE_OPTIONS,
  AUTOPILOT_PUBLISH_MODE_OPTIONS,
  autopilotCadenceLabel,
  autopilotPublishModeLabel,
  type AutopilotCadence,
  type AutopilotPublishMode,
  type AutopilotSettings,
  type AutopilotSettingsSavePayload,
} from "./types";

const selectClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

function draftFromSettings(settings: AutopilotSettings | null): AutopilotSettingsSavePayload {
  return {
    enabled: settings?.enabled ?? false,
    cadence: settings?.cadence === "weekly" ? "weekly" : "daily",
    publishMode:
      settings?.publishMode === "live" || settings?.publishMode === "manual"
        ? settings.publishMode
        : "draft",
  };
}

export function AutopilotView({
  settings,
  error,
  loading,
  onSave,
  saving = false,
}: {
  settings: AutopilotSettings | null;
  error?: string | null;
  loading?: boolean;
  onSave?: (payload: AutopilotSettingsSavePayload) => void | Promise<void>;
  saving?: boolean;
}) {
  const editable = Boolean(onSave);
  const [draft, setDraft] = useState<AutopilotSettingsSavePayload>(() => draftFromSettings(settings));

  useEffect(() => {
    setDraft(draftFromSettings(settings));
  }, [settings]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading autopilot settings…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  const enabled = editable ? draft.enabled : (settings?.enabled ?? false);
  const cadence = editable ? draft.cadence : settings?.cadence;
  const publishMode = editable ? draft.publishMode : settings?.publishMode;

  return (
    <div className="paper-card p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Autopilot settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Automated content generation and publishing for the active project.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Autopilot enabled</p>
            {!editable ? (
              <p className="text-xs text-muted-foreground">Read-only view — edit in Publishing settings</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Picks the next due topic from your content strategy calendar
              </p>
            )}
          </div>
          {editable ? (
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Autopilot enabled"
              disabled={saving}
              onClick={() => setDraft((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-50",
                enabled ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition",
                  enabled ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          ) : (
            <span
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors",
                enabled ? "bg-primary" : "bg-muted",
              )}
              aria-hidden
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition",
                  enabled ? "translate-x-5" : "translate-x-0",
                )}
              />
            </span>
          )}
        </div>

        {editable ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="autopilot-cadence" className="text-sm font-medium">
                Cadence
              </label>
              <select
                id="autopilot-cadence"
                className={selectClassName}
                value={draft.cadence}
                disabled={saving}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    cadence: event.target.value as AutopilotCadence,
                  }))
                }
              >
                {AUTOPILOT_CADENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="autopilot-publish-mode" className="text-sm font-medium">
                Publish mode
              </label>
              <select
                id="autopilot-publish-mode"
                className={selectClassName}
                value={draft.publishMode}
                disabled={saving}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    publishMode: event.target.value as AutopilotPublishMode,
                  }))
                }
              >
                {AUTOPILOT_PUBLISH_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cadence</dt>
              <dd className="mt-1 text-sm font-medium">{autopilotCadenceLabel(cadence)}</dd>
            </div>
            <div className="rounded-lg border border-border px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Publish mode</dt>
              <dd className="mt-1 text-sm font-medium">{autopilotPublishModeLabel(publishMode)}</dd>
            </div>
          </dl>
        )}

        {!enabled ? (
          <p className="text-sm text-muted-foreground">
            {editable
              ? "Autopilot is off. Enable it to schedule content automatically from your strategy calendar."
              : "Autopilot is off. Enable autopilot below to schedule content automatically."}
          </p>
        ) : null}

        {editable && onSave ? (
          <button
            type="button"
            onClick={() => void onSave(draft)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden />
            {saving ? "Saving…" : "Save autopilot settings"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
