import { Save } from "lucide-react";
import type { BrandProfileFormValues } from "./types";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export function BrandProfileEditView({
  values,
  onChange,
  onSave,
  saving = false,
}: {
  values: BrandProfileFormValues;
  onChange: (values: BrandProfileFormValues) => void;
  onSave: () => void;
  saving?: boolean;
}) {
  function updateField<K extends keyof BrandProfileFormValues>(
    field: K,
    value: BrandProfileFormValues[K],
  ) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="paper-card space-y-6 p-6">
      <div>
        <h2 className="font-semibold">Brand Profile</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Used to personalize drafts for this project.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="brand-company-name" className="text-sm font-medium">
            Company name
          </label>
          <input
            id="brand-company-name"
            value={values.companyName}
            onChange={(event) => updateField("companyName", event.target.value)}
            placeholder="Acme Corp"
            className={inputClassName}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="brand-industry" className="text-sm font-medium">
            Industry
          </label>
          <textarea
            id="brand-industry"
            value={values.industry}
            onChange={(event) => updateField("industry", event.target.value)}
            placeholder="B2B SaaS for HR teams"
            rows={2}
            className={`${inputClassName} resize-none`}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="brand-target-audience" className="text-sm font-medium">
          Target audience
        </label>
        <textarea
          id="brand-target-audience"
          value={values.targetAudience}
          onChange={(event) => updateField("targetAudience", event.target.value)}
          rows={3}
          className={`${inputClassName} resize-none`}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="brand-voice-tone" className="text-sm font-medium">
          Brand voice &amp; tone
        </label>
        <textarea
          id="brand-voice-tone"
          value={values.voiceTone}
          onChange={(event) => updateField("voiceTone", event.target.value)}
          rows={3}
          className={`${inputClassName} resize-none`}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="brand-primary-keywords" className="text-sm font-medium">
          Primary keywords
        </label>
        <input
          id="brand-primary-keywords"
          value={values.primaryKeywords}
          onChange={(event) => updateField("primaryKeywords", event.target.value)}
          placeholder="seo, content marketing, b2b growth"
          className={inputClassName}
        />
        <p className="text-xs text-muted-foreground">Comma-separated</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="brand-competitor-urls" className="text-sm font-medium">
          Competitor URLs
        </label>
        <textarea
          id="brand-competitor-urls"
          value={values.competitorUrls}
          onChange={(event) => updateField("competitorUrls", event.target.value)}
          placeholder="https://rival.co"
          rows={3}
          className={`${inputClassName} resize-none font-mono text-sm`}
        />
        <p className="text-xs text-muted-foreground">One URL per line</p>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" aria-hidden />
        {saving ? "Saving…" : "Save brand profile"}
      </button>
    </div>
  );
}
