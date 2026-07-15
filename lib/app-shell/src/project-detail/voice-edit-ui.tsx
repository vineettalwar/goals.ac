import { Save } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@workspace/content-engine/support/content/content-language";
import type { VoiceStyleFormValues } from "./types";

const inputClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

const TONE_PRESETS = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "technical", label: "Technical" },
  { value: "conversational", label: "Conversational" },
] as const;

const READING_LEVELS = [
  { value: "general", label: "General" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" },
] as const;

const HUMANIZATION_LEVELS = [
  { value: "off", label: "Off" },
  { value: "light", label: "Light" },
  { value: "strong", label: "Strong" },
] as const;

const WORD_COUNT_PRESETS = [
  { label: "Short", value: 400 },
  { label: "Medium", value: 800 },
  { label: "Long", value: 1500 },
] as const;

const LANGUAGES = SUPPORTED_LANGUAGES;

export function VoiceStyleEditView({
  values,
  onChange,
  onSave,
  saving = false,
}: {
  values: VoiceStyleFormValues;
  onChange: (values: VoiceStyleFormValues) => void;
  onSave: () => void;
  saving?: boolean;
}) {
  function updateField<K extends keyof VoiceStyleFormValues>(
    field: K,
    value: VoiceStyleFormValues[K],
  ) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="paper-card space-y-6 p-6">
      <div>
        <h2 className="font-semibold">Brand Voice</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Customize how AI writes content to match your brand style.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Tone preset</p>
        <div className="flex flex-wrap gap-2">
          {TONE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => updateField("tonePreset", preset.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                values.tonePreset === preset.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="voice-persona-name" className="text-sm font-medium">
          Writing persona
        </label>
        <input
          id="voice-persona-name"
          value={values.personaName}
          onChange={(event) => updateField("personaName", event.target.value)}
          placeholder='e.g. "Alex, our Head of Growth"'
          className={inputClassName}
        />
        <p className="text-xs text-muted-foreground">
          Give the AI writer a name and role to adopt when generating content.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Default word count</p>
          <span className="text-sm font-semibold">
            {values.defaultWordCount.toLocaleString()} words
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {WORD_COUNT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => updateField("defaultWordCount", preset.value)}
              className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                values.defaultWordCount === preset.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              {preset.label} ({preset.value})
            </button>
          ))}
        </div>
        <input
          type="range"
          min={300}
          max={3000}
          step={100}
          value={values.defaultWordCount}
          onChange={(event) => updateField("defaultWordCount", Number(event.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>300</span>
          <span>3,000</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="voice-primary-language" className="text-sm font-medium">
            Primary language
          </label>
          <select
            id="voice-primary-language"
            value={values.primaryLanguage}
            onChange={(event) => updateField("primaryLanguage", event.target.value)}
            className={inputClassName}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="voice-reading-level" className="text-sm font-medium">
            Reading level
          </label>
          <select
            id="voice-reading-level"
            value={values.readingLevel}
            onChange={(event) => updateField("readingLevel", event.target.value)}
            className={inputClassName}
          >
            {READING_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Humanization</p>
        <div className="flex flex-wrap gap-2">
          {HUMANIZATION_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => updateField("humanizationLevel", level.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                values.humanizationLevel === level.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:border-primary/40"
              }`}
            >
              {level.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Light polishes rhythm; strong rewrites while preserving SEO structure.
        </p>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        <Save className="h-4 w-4" aria-hidden />
        {saving ? "Saving…" : "Save brand voice"}
      </button>
    </div>
  );
}
