import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../../cn";
import { ConnectSetupSteps } from "../connect-setup-steps";

// ---------------------------------------------------------------------------
// Shared primitives (also used by esp-connect-dialogs)
// ---------------------------------------------------------------------------

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const inputClassName =
  "h-10 w-full rounded-sm border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";

type SimpleDialogProps = {
  open: boolean;
  title: string;
  titleId: string;
  onClose: () => void;
  loading?: boolean;
  className?: string;
  children: ReactNode;
};

export function SimpleDialog({
  open,
  title,
  titleId,
  onClose,
  loading,
  className,
  children,
}: SimpleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleClose() {
    if (loading) return;
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      id={titleId}
      aria-labelledby={titleId}
      className={cn(
        "paper-card fixed left-1/2 top-1/2 z-50 m-0 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border border-border p-6 backdrop:bg-black/45",
        className,
      )}
      onClose={handleClose}
      onCancel={(event) => {
        if (loading) event.preventDefault();
      }}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close dialog"
          onClick={handleClose}
          disabled={loading}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {children}
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Schema-driven connect dialog
// ---------------------------------------------------------------------------

export type FieldDef = {
  key: string;
  label: string;
  type: "url" | "text" | "password" | "number" | "select";
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  visibleWhen?: (values: Record<string, string>) => boolean;
};

type ModeDef = {
  key: string;
  label: string;
  fields: FieldDef[];
};

export type ConnectDialogConfig<T = unknown> = {
  id: string;
  title: string;
  setupSteps: string[];
  modes?: ModeDef[];
  defaultMode?: string;
  sharedFields?: FieldDef[];
  fields?: FieldDef[];
  urlFields?: string[];
  buildPayload: (values: Record<string, string>, mode?: string) => T;
};

export type ConnectDialogBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
};

function getVisibleFields(fields: FieldDef[], values: Record<string, string>): FieldDef[] {
  return fields.filter((f) => !f.visibleWhen || f.visibleWhen(values));
}

function getDefaults(config: ConnectDialogConfig): Record<string, string> {
  const defaults: Record<string, string> = {};
  const allFields = [
    ...(config.fields ?? []),
    ...(config.modes?.flatMap((m) => m.fields) ?? []),
    ...(config.sharedFields ?? []),
  ];
  for (const f of allFields) {
    defaults[f.key] = f.defaultValue ?? "";
  }
  return defaults;
}

export function SchemaConnectDialog<T>({
  config,
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  config: ConnectDialogConfig<T>;
  onSave: (payload: T) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => getDefaults(config));
  const [mode, setMode] = useState(config.defaultMode ?? config.modes?.[0]?.key ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setValues(getDefaults(config));
      setMode(config.defaultMode ?? config.modes?.[0]?.key ?? "");
      setFieldErrors({});
      setFormError(null);
    }
  }, [open]);

  function close() {
    if (saving) return;
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const activeFields = getActiveFields();
    const visible = getVisibleFields(activeFields, values);
    const errors: Record<string, string> = {};
    const urlSet = new Set(config.urlFields ?? []);

    for (const f of visible) {
      const val = values[f.key]?.trim() ?? "";
      const required = f.required !== false;
      if (required && !val) {
        errors[f.key] = `${f.label} is required`;
      } else if (val && urlSet.has(f.key) && !isValidUrl(val)) {
        errors[f.key] = "Enter a valid URL";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    onSave(config.buildPayload(values, mode || undefined));
  }

  function getActiveFields(): FieldDef[] {
    if (config.modes) {
      const modeFields = config.modes.find((m) => m.key === mode)?.fields ?? [];
      return [...modeFields, ...(config.sharedFields ?? [])];
    }
    return config.fields ?? [];
  }

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const activeFields = getActiveFields();
  const visibleFields = getVisibleFields(activeFields, values);

  return (
    <SimpleDialog open={open} title={config.title} titleId={`${config.id}-connect-title`} onClose={close} loading={saving}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps steps={config.setupSteps} />

        {config.modes && config.modes.length > 1 ? (
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {config.modes.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={cn(
                  "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  mode === m.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        ) : null}

        {visibleFields.map((f) => (
          <label key={f.key} className="block text-sm">
            <span className="mb-1 block font-medium">{f.label}</span>
            {f.type === "select" ? (
              <select
                value={values[f.key] ?? ""}
                onChange={(e) => setValue(f.key, e.target.value)}
                className={inputClassName}
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === "number" ? "number" : f.type === "url" ? "url" : f.type === "password" ? "password" : "text"}
                value={values[f.key] ?? ""}
                onChange={(e) => setValue(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={inputClassName}
                autoComplete={f.autoComplete ?? "off"}
                {...(f.type === "number" ? { min: 1 } : {})}
              />
            )}
            {fieldErrors[f.key] ? <p className="mt-1 text-xs text-red-700">{fieldErrors[f.key]}</p> : null}
            {f.hint ? <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p> : null}
          </label>
        ))}

        {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Connecting…" : "Connect"}
          </button>
        </div>
      </form>
    </SimpleDialog>
  );
}
