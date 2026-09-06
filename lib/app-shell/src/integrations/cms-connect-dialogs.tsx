import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../cn";
import type {
  DrupalConnectPayload,
  GhostConnectPayload,
  JoomlaConnectPayload,
  NotionConnectPayload,
  ShopifyConnectPayload,
  WebflowConnectPayload,
  WordPressConnectPayload,
} from "./cms-connect-types";
import {
  CMS_CONNECT_STEPS,
  ConnectSetupSteps,
  getCmsSetupSteps,
} from "./connect-setup-steps";

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
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";

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
        "paper-card fixed left-1/2 top-1/2 z-50 m-0 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border p-6 shadow-lg backdrop:bg-black/20 backdrop:backdrop-blur-sm",
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

type ConnectDialogBaseProps = {
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

// ---------------------------------------------------------------------------
// CMS platform configs
// ---------------------------------------------------------------------------

const wordpressConfig: ConnectDialogConfig<WordPressConnectPayload> = {
  id: "wordpress",
  title: "Connect WordPress",
  setupSteps: CMS_CONNECT_STEPS.wordpress,
  defaultMode: "api",
  urlFields: ["siteUrl"],
  modes: [
    {
      key: "api",
      label: "REST API",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "username", label: "Username", type: "text", placeholder: "wordpress-user", autoComplete: "username" },
        { key: "appPassword", label: "Application password", type: "password", autoComplete: "new-password", hint: "Create one under Users → Profile → Application Passwords." },
      ],
    },
    {
      key: "plugin",
      label: "Plugin",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "siteKey", label: "Site key", type: "password", hint: "Copy the site key from the goals.ac WordPress plugin settings." },
      ],
    },
  ],
  buildPayload(v, mode) {
    const siteUrl = v.siteUrl.trim();
    if (mode === "plugin") {
      return { connectionType: "plugin", siteUrl, siteKey: v.siteKey.trim() } as WordPressConnectPayload;
    }
    return { connectionType: "api", siteUrl, username: v.username.trim(), appPassword: v.appPassword.trim() } as WordPressConnectPayload;
  },
};

const ghostConfig: ConnectDialogConfig<GhostConnectPayload> = {
  id: "ghost",
  title: "Connect Ghost",
  setupSteps: CMS_CONNECT_STEPS.ghost,
  urlFields: ["apiUrl"],
  fields: [
    { key: "apiUrl", label: "Admin API URL", type: "url", placeholder: "https://example.com/ghost/api/admin", autoComplete: "url" },
    { key: "adminApiKey", label: "Admin API key", type: "password", hint: "Create an Admin API key in Ghost → Settings → Integrations." },
  ],
  buildPayload(v) {
    return { apiUrl: v.apiUrl.trim(), adminApiKey: v.adminApiKey.trim() };
  },
};

const drupalConfig: ConnectDialogConfig<DrupalConnectPayload> = {
  id: "drupal",
  title: "Connect Drupal",
  setupSteps: CMS_CONNECT_STEPS.drupal,
  defaultMode: "plugin",
  urlFields: ["siteUrl"],
  modes: [
    {
      key: "plugin",
      label: "Plugin",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "siteKey", label: "Site key", type: "password", hint: "Copy the site key from the goals.ac Drupal module settings." },
      ],
    },
    {
      key: "api",
      label: "JSON:API",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "authType", label: "Auth type", type: "select", defaultValue: "basic", options: [{ value: "basic", label: "Basic auth" }, { value: "bearer", label: "Bearer token" }] },
        { key: "username", label: "Username", type: "text", autoComplete: "username", visibleWhen: (v) => v.authType !== "bearer" },
        { key: "password", label: "Password", type: "password", autoComplete: "current-password", visibleWhen: (v) => v.authType !== "bearer" },
        { key: "accessToken", label: "Access token", type: "password", visibleWhen: (v) => v.authType === "bearer" },
        { key: "contentType", label: "Content type machine name", type: "text", placeholder: "article", required: false, defaultValue: "article" },
      ],
    },
  ],
  buildPayload(v, mode) {
    const siteUrl = v.siteUrl.trim();
    if (mode === "plugin") {
      return { connectionType: "plugin", siteUrl, siteKey: v.siteKey.trim() } as DrupalConnectPayload;
    }
    const authType = (v.authType || "basic") as "basic" | "bearer";
    const payload: DrupalConnectPayload = { connectionType: "api", siteUrl, authType };
    if (authType === "bearer") {
      (payload as { accessToken?: string }).accessToken = v.accessToken.trim();
    } else {
      (payload as { username?: string; password?: string }).username = v.username.trim();
      (payload as { username?: string; password?: string }).password = v.password.trim();
    }
    const ct = v.contentType?.trim();
    if (ct) (payload as { contentType?: string }).contentType = ct;
    return payload;
  },
};

const joomlaConfig: ConnectDialogConfig<JoomlaConnectPayload> = {
  id: "joomla",
  title: "Connect Joomla",
  setupSteps: CMS_CONNECT_STEPS.joomla,
  defaultMode: "plugin",
  urlFields: ["siteUrl"],
  modes: [
    {
      key: "plugin",
      label: "Plugin",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "siteKey", label: "Site key", type: "password", hint: "Copy the site key from the goals.ac Joomla plugin settings." },
      ],
    },
    {
      key: "api",
      label: "Web Services API",
      fields: [
        { key: "siteUrl", label: "Site URL", type: "url", placeholder: "https://example.com", autoComplete: "url" },
        { key: "apiToken", label: "API token", type: "password", hint: "Create a token under System → Web Services → API Tokens." },
        { key: "categoryId", label: "Category ID (optional)", type: "number", placeholder: "2", required: false },
      ],
    },
  ],
  buildPayload(v, mode) {
    const siteUrl = v.siteUrl.trim();
    if (mode === "plugin") {
      return { connectionType: "plugin", siteUrl, siteKey: v.siteKey.trim() } as JoomlaConnectPayload;
    }
    const payload: JoomlaConnectPayload = { connectionType: "api", siteUrl, apiToken: v.apiToken.trim() };
    const cat = v.categoryId?.trim();
    if (cat) (payload as { categoryId?: number }).categoryId = Number(cat);
    return payload;
  },
};

const notionConfig: ConnectDialogConfig<NotionConnectPayload> = {
  id: "notion",
  title: "Connect Notion",
  setupSteps: CMS_CONNECT_STEPS.notion,
  fields: [
    { key: "integrationToken", label: "Integration token", type: "password", placeholder: "secret_...", hint: "Create an integration at notion.so/my-integrations and share your database with it." },
    { key: "databaseId", label: "Database ID", type: "text", placeholder: "32-character hex ID from your database URL" },
  ],
  buildPayload(v) {
    return { integrationToken: v.integrationToken.trim(), databaseId: v.databaseId.trim() };
  },
};

const webflowConfig: ConnectDialogConfig<WebflowConnectPayload> = {
  id: "webflow",
  title: "Connect Webflow",
  setupSteps: CMS_CONNECT_STEPS.webflow,
  fields: [
    { key: "apiToken", label: "API token", type: "password", placeholder: "Webflow site API token", hint: "Site Settings → Integrations → API access" },
    { key: "collectionId", label: "Collection ID", type: "text", placeholder: "64-character collection ID" },
    { key: "bodyFieldSlug", label: "Body field slug", type: "text", placeholder: "post-body", defaultValue: "post-body", hint: "Rich Text field slug in your collection (default: post-body)." },
  ],
  buildPayload(v) {
    return {
      apiToken: v.apiToken.trim(),
      collectionId: v.collectionId.trim(),
      bodyFieldSlug: v.bodyFieldSlug.trim() || "post-body",
    };
  },
};

const shopifyConfig: ConnectDialogConfig<ShopifyConnectPayload> = {
  id: "shopify",
  title: "Connect Shopify",
  setupSteps: CMS_CONNECT_STEPS.shopify,
  defaultMode: "api",
  urlFields: ["siteUrl"],
  modes: [
    {
      key: "api",
      label: "Admin API",
      fields: [
        { key: "shopDomain", label: "Shop domain", type: "text", placeholder: "mystore.myshopify.com" },
        { key: "accessToken", label: "Admin API access token", type: "password" },
      ],
    },
    {
      key: "plugin",
      label: "Plugin",
      fields: [
        { key: "siteUrl", label: "App URL", type: "url", placeholder: "https://your-store.myshopify.com", autoComplete: "url" },
        { key: "siteKey", label: "Site key", type: "password", hint: "Copy the site key from the goals.ac Shopify app after installation." },
      ],
    },
  ],
  sharedFields: [
    { key: "blogId", label: "Blog ID (optional)", type: "text", placeholder: "gid://shopify/Blog/...", required: false },
  ],
  buildPayload(v, mode) {
    const blogId = v.blogId?.trim() || undefined;
    if (mode === "plugin") {
      return { connectionType: "plugin", siteUrl: v.siteUrl.trim(), siteKey: v.siteKey.trim(), ...(blogId ? { blogId } : {}) } as ShopifyConnectPayload;
    }
    return { connectionType: "api", shopDomain: v.shopDomain.trim(), accessToken: v.accessToken.trim(), ...(blogId ? { blogId } : {}) } as ShopifyConnectPayload;
  },
};

// ---------------------------------------------------------------------------
// Public CMS dialog exports (thin wrappers)
// ---------------------------------------------------------------------------

export function WordPressConnectDialog(props: ConnectDialogBaseProps & { onSave: (p: WordPressConnectPayload) => void }) {
  return <SchemaConnectDialog config={wordpressConfig} {...props} />;
}

export function GhostConnectDialog(props: ConnectDialogBaseProps & { onSave: (p: GhostConnectPayload) => void }) {
  return <SchemaConnectDialog config={ghostConfig} {...props} />;
}

export function DrupalConnectDialog(props: ConnectDialogBaseProps & { onSave: (p: DrupalConnectPayload) => void }) {
  return <SchemaConnectDialog config={drupalConfig} {...props} />;
}

export function JoomlaConnectDialog(props: ConnectDialogBaseProps & { onSave: (p: JoomlaConnectPayload) => void }) {
  return <SchemaConnectDialog config={joomlaConfig} {...props} />;
}

export function NotionConnectDialog(props: ConnectDialogBaseProps & { onSave: (p: NotionConnectPayload) => void }) {
  return <SchemaConnectDialog config={notionConfig} {...props} />;
}

export function WebflowConnectDialog(props: ConnectDialogBaseProps & { onSave: (p: WebflowConnectPayload) => void }) {
  return <SchemaConnectDialog config={webflowConfig} {...props} />;
}

export function ShopifyConnectDialog(props: ConnectDialogBaseProps & { onSave: (p: ShopifyConnectPayload) => void }) {
  return <SchemaConnectDialog config={shopifyConfig} {...props} />;
}

export function CmsFullAppConnectDialog({
  open,
  platformLabel,
  platformKey,
  onOpenChange,
  fullAppIntegrationsUrl,
}: ConnectDialogBaseProps & {
  platformLabel: string;
  platformKey?: string;
  fullAppIntegrationsUrl?: string;
}) {
  return (
    <SimpleDialog
      open={open}
      title={`Connect ${platformLabel}`}
      titleId="cms-full-app-connect-title"
      onClose={() => onOpenChange(false)}
    >
      <div className="space-y-4 text-sm">
        <ConnectSetupSteps steps={getCmsSetupSteps(platformKey, platformLabel)} />
        <p className="text-muted-foreground">
          Full connection forms for {platformLabel} are available in Integrations.
        </p>
        {fullAppIntegrationsUrl ? (
          <p>
            Open{" "}
            <a
              href={fullAppIntegrationsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Integrations
            </a>{" "}
            to connect this platform.
          </p>
        ) : null}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </SimpleDialog>
  );
}
