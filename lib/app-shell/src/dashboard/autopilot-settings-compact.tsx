import { useEffect, useState, type ReactNode } from "react";
import { Save } from "lucide-react";
import { cn } from "../cn";
import type {
  DashboardAutopilotCadence,
  DashboardAutopilotSavePayload,
  DashboardAutopilotSettings,
  DashboardLinkProps,
} from "./types";

const selectClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

function draftFromSettings(settings: DashboardAutopilotSettings | null): DashboardAutopilotSavePayload {
  return {
    enabled: settings?.enabled ?? false,
    cadence: settings?.cadence === "weekly" ? "weekly" : "daily",
    autoQueueOpportunities: settings?.autoQueueOpportunities ?? false,
  };
}

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

/**
 * Compact enable / cadence / auto-queue controls for the dashboard.
 * Full timezone, publish mode, and visibility settings stay on Publishing.
 */
export function AutopilotSettingsCompact({
  projectId,
  settings,
  saving = false,
  saveError = null,
  onSave,
  renderLink,
}: {
  projectId: number;
  settings: DashboardAutopilotSettings | null;
  saving?: boolean;
  saveError?: string | null;
  onSave: (payload: DashboardAutopilotSavePayload) => void | Promise<void>;
  renderLink: (props: DashboardLinkProps) => ReactNode;
}) {
  const [draft, setDraft] = useState<DashboardAutopilotSavePayload>(() => draftFromSettings(settings));

  useEffect(() => {
    setDraft(draftFromSettings(settings));
  }, [settings]);

  return (
    <div className="mb-4 rounded-lg border border-border bg-secondary/20 px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Autopilot settings
        </p>
        {renderLink({
          href: `/projects/${projectId}?tab=publishing`,
          className: "text-xs font-medium text-primary hover:underline",
          children: "More settings",
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Enable autopilot</p>
            <p className="text-xs text-muted-foreground">
              Generate the next due topic on your cadence
            </p>
          </div>
          <Switch
            checked={draft.enabled}
            disabled={saving}
            label="Enable autopilot"
            onChange={(enabled) => setDraft((prev) => ({ ...prev, enabled }))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="dash-autopilot-cadence" className="text-sm font-medium">
              Cadence
            </label>
            <select
              id="dash-autopilot-cadence"
              className={selectClassName}
              value={draft.cadence}
              disabled={saving}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  cadence: event.target.value as DashboardAutopilotCadence,
                }))
              }
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">Auto-queue</p>
                <p className="text-xs text-muted-foreground">High-score keyword gaps</p>
              </div>
              <Switch
                checked={draft.autoQueueOpportunities}
                disabled={saving}
                label="Auto-queue keyword opportunities"
                onChange={(autoQueueOpportunities) =>
                  setDraft((prev) => ({ ...prev, autoQueueOpportunities }))
                }
              />
            </div>
          </div>
        </div>

        {saveError ? <p className="text-xs text-red-700">{saveError}</p> : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void onSave(draft)}
            disabled={saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
