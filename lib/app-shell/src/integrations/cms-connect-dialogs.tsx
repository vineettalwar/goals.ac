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
import { ConnectSetupSteps, getFullAppCmsSetupSteps } from "./connect-setup-steps";

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const inputClassName =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";

type SimpleDialogProps = {
  open: boolean;
  title: string;
  titleId: string;
  onClose: () => void;
  loading?: boolean;
  children: ReactNode;
};

function SimpleDialog({ open, title, titleId, onClose, loading, children }: SimpleDialogProps) {
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
      className="paper-card fixed left-1/2 top-1/2 z-50 m-0 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border p-6 shadow-lg backdrop:bg-black/20 backdrop:backdrop-blur-sm"
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

type ConnectDialogBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
};


export function WordPressConnectDialog({
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  onSave: (payload: WordPressConnectPayload) => void;
}) {
  const [connectionType, setConnectionType] = useState<"api" | "plugin">("api");
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [siteKey, setSiteKey] = useState("");
  const [siteUrlError, setSiteUrlError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setConnectionType("api");
    setSiteUrl("");
    setUsername("");
    setAppPassword("");
    setSiteKey("");
    setSiteUrlError(null);
    setFormError(null);
  }

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function close() {
    if (saving) return;
    resetForm();
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedSiteUrl = siteUrl.trim();
    let valid = true;

    if (!trimmedSiteUrl) {
      setSiteUrlError("Site URL is required");
      valid = false;
    } else if (!isValidUrl(trimmedSiteUrl)) {
      setSiteUrlError("Enter a valid URL");
      valid = false;
    } else {
      setSiteUrlError(null);
    }

    if (connectionType === "api") {
      if (!username.trim() || !appPassword.trim()) {
        setFormError("Username and application password are required");
        valid = false;
      }
    } else if (!siteKey.trim()) {
      setFormError("Site key is required");
      valid = false;
    }

    if (!valid) return;

    setFormError(null);
    if (connectionType === "api") {
      onSave({
        connectionType: "api",
        siteUrl: trimmedSiteUrl,
        username: username.trim(),
        appPassword: appPassword.trim(),
      });
    } else {
      onSave({
        connectionType: "plugin",
        siteUrl: trimmedSiteUrl,
        siteKey: siteKey.trim(),
      });
    }
  }

  return (
    <SimpleDialog
      open={open}
      title="Connect WordPress"
      titleId="wordpress-connect-title"
      onClose={close}
      loading={saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps
          steps={[
            "Choose Application Password (REST) or goals.ac plugin (HMAC).",
            "Paste site URL plus username/app password, or plugin site key from WP Admin → goals.ac.",
            "Save, then Run health check on Integrations to confirm publish is ready.",
          ]}
        />
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["api", "plugin"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setConnectionType(method)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                connectionType === method
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {method === "api" ? "REST API" : "Plugin"}
            </button>
          ))}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Site URL</span>
          <input
            type="url"
            value={siteUrl}
            onChange={(event) => setSiteUrl(event.target.value)}
            placeholder="https://example.com"
            className={inputClassName}
            autoComplete="url"
          />
          {siteUrlError ? <p className="mt-1 text-xs text-red-700">{siteUrlError}</p> : null}
        </label>

        {connectionType === "api" ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="wordpress-user"
                className={inputClassName}
                autoComplete="username"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Application password</span>
              <input
                type="password"
                value={appPassword}
                onChange={(event) => setAppPassword(event.target.value)}
                className={inputClassName}
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Create one under Users → Profile → Application Passwords.
              </p>
            </label>
          </>
        ) : (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Site key</span>
            <input
              type="password"
              value={siteKey}
              onChange={(event) => setSiteKey(event.target.value)}
              className={inputClassName}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Copy the site key from the goals.ac WordPress plugin settings.
            </p>
          </label>
        )}

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

export function GhostConnectDialog({
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  onSave: (payload: GhostConnectPayload) => void;
}) {
  const [apiUrl, setApiUrl] = useState("");
  const [adminApiKey, setAdminApiKey] = useState("");
  const [apiUrlError, setApiUrlError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setApiUrl("");
    setAdminApiKey("");
    setApiUrlError(null);
    setFormError(null);
  }

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function close() {
    if (saving) return;
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedApiUrl = apiUrl.trim();
    let valid = true;

    if (!trimmedApiUrl) {
      setApiUrlError("Ghost Admin API URL is required");
      valid = false;
    } else if (!isValidUrl(trimmedApiUrl)) {
      setApiUrlError("Enter a valid URL");
      valid = false;
    } else {
      setApiUrlError(null);
    }

    if (!adminApiKey.trim()) {
      setFormError("Admin API key is required");
      valid = false;
    }

    if (!valid) return;

    setFormError(null);
    onSave({
      apiUrl: trimmedApiUrl,
      adminApiKey: adminApiKey.trim(),
    });
  }

  return (
    <SimpleDialog
      open={open}
      title="Connect Ghost"
      titleId="ghost-connect-title"
      onClose={close}
      loading={saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps
          steps={[
            "In Ghost Admin → Settings → Integrations, create a Custom Integration.",
            "Copy the Admin API URL and Admin API Key into the fields below.",
            "Save, then Run health check to verify posting works.",
          ]}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Admin API URL</span>
          <input
            type="url"
            value={apiUrl}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder="https://example.com/ghost/api/admin"
            className={inputClassName}
            autoComplete="url"
          />
          {apiUrlError ? <p className="mt-1 text-xs text-red-700">{apiUrlError}</p> : null}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Admin API key</span>
          <input
            type="password"
            value={adminApiKey}
            onChange={(event) => setAdminApiKey(event.target.value)}
            className={inputClassName}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Create an Admin API key in Ghost → Settings → Integrations.
          </p>
        </label>

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

export function DrupalConnectDialog({
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  onSave: (payload: DrupalConnectPayload) => void;
}) {
  const [connectionType, setConnectionType] = useState<"api" | "plugin">("plugin");
  const [siteUrl, setSiteUrl] = useState("");
  const [siteKey, setSiteKey] = useState("");
  const [authType, setAuthType] = useState<"basic" | "bearer">("basic");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [contentType, setContentType] = useState("article");
  const [siteUrlError, setSiteUrlError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setConnectionType("plugin");
    setSiteUrl("");
    setSiteKey("");
    setAuthType("basic");
    setUsername("");
    setPassword("");
    setAccessToken("");
    setContentType("article");
    setSiteUrlError(null);
    setFormError(null);
  }

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function close() {
    if (saving) return;
    resetForm();
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedSiteUrl = siteUrl.trim();
    let valid = true;

    if (!trimmedSiteUrl) {
      setSiteUrlError("Site URL is required");
      valid = false;
    } else if (!isValidUrl(trimmedSiteUrl)) {
      setSiteUrlError("Enter a valid URL");
      valid = false;
    } else {
      setSiteUrlError(null);
    }

    if (connectionType === "plugin") {
      if (!siteKey.trim()) {
        setFormError("Site key is required");
        valid = false;
      }
    } else if (authType === "bearer") {
      if (!accessToken.trim()) {
        setFormError("Access token is required");
        valid = false;
      }
    } else if (!username.trim() || !password.trim()) {
      setFormError("Username and password are required");
      valid = false;
    }

    if (!valid) return;

    setFormError(null);
    if (connectionType === "plugin") {
      onSave({
        connectionType: "plugin",
        siteUrl: trimmedSiteUrl,
        siteKey: siteKey.trim(),
      });
      return;
    }

    const payload: DrupalConnectPayload = {
      connectionType: "api",
      siteUrl: trimmedSiteUrl,
      authType,
    };
    if (authType === "bearer") {
      payload.accessToken = accessToken.trim();
    } else {
      payload.username = username.trim();
      payload.password = password.trim();
    }
    const trimmedContentType = contentType.trim();
    if (trimmedContentType) {
      payload.contentType = trimmedContentType;
    }
    onSave(payload);
  }

  return (
    <SimpleDialog
      open={open}
      title="Connect Drupal"
      titleId="drupal-connect-title"
      onClose={close}
      loading={saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps
          steps={[
            "Prefer the goals.ac Drupal module (HMAC) for layout-aware publish, or JSON:API with a content type.",
            "Paste site URL plus site key (plugin) or username/password (JSON:API).",
            "Save, then Run health check before publishing.",
          ]}
        />
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["plugin", "api"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setConnectionType(method)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                connectionType === method
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {method === "plugin" ? "Plugin" : "JSON:API"}
            </button>
          ))}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Site URL</span>
          <input
            type="url"
            value={siteUrl}
            onChange={(event) => setSiteUrl(event.target.value)}
            placeholder="https://example.com"
            className={inputClassName}
            autoComplete="url"
          />
          {siteUrlError ? <p className="mt-1 text-xs text-red-700">{siteUrlError}</p> : null}
        </label>

        {connectionType === "plugin" ? (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Site key</span>
            <input
              type="password"
              value={siteKey}
              onChange={(event) => setSiteKey(event.target.value)}
              className={inputClassName}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Copy the site key from the goals.ac Drupal module settings.
            </p>
          </label>
        ) : (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Auth type</span>
              <select
                value={authType}
                onChange={(event) => setAuthType(event.target.value as "basic" | "bearer")}
                className={inputClassName}
              >
                <option value="basic">Basic auth</option>
                <option value="bearer">Bearer token</option>
              </select>
            </label>

            {authType === "basic" ? (
              <>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Username</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={inputClassName}
                    autoComplete="username"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClassName}
                    autoComplete="current-password"
                  />
                </label>
              </>
            ) : (
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Access token</span>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(event) => setAccessToken(event.target.value)}
                  className={inputClassName}
                  autoComplete="off"
                />
              </label>
            )}

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Content type machine name</span>
              <input
                type="text"
                value={contentType}
                onChange={(event) => setContentType(event.target.value)}
                placeholder="article"
                className={inputClassName}
              />
            </label>
          </>
        )}

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

export function JoomlaConnectDialog({
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  onSave: (payload: JoomlaConnectPayload) => void;
}) {
  const [connectionType, setConnectionType] = useState<"api" | "plugin">("plugin");
  const [siteUrl, setSiteUrl] = useState("");
  const [siteKey, setSiteKey] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [siteUrlError, setSiteUrlError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setConnectionType("plugin");
    setSiteUrl("");
    setSiteKey("");
    setApiToken("");
    setCategoryId("");
    setSiteUrlError(null);
    setFormError(null);
  }

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function close() {
    if (saving) return;
    resetForm();
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedSiteUrl = siteUrl.trim();
    let valid = true;

    if (!trimmedSiteUrl) {
      setSiteUrlError("Site URL is required");
      valid = false;
    } else if (!isValidUrl(trimmedSiteUrl)) {
      setSiteUrlError("Enter a valid URL");
      valid = false;
    } else {
      setSiteUrlError(null);
    }

    if (connectionType === "plugin") {
      if (!siteKey.trim()) {
        setFormError("Site key is required");
        valid = false;
      }
    } else if (!apiToken.trim()) {
      setFormError("API token is required");
      valid = false;
    }

    if (!valid) return;

    setFormError(null);
    if (connectionType === "plugin") {
      onSave({
        connectionType: "plugin",
        siteUrl: trimmedSiteUrl,
        siteKey: siteKey.trim(),
      });
      return;
    }

    const payload: JoomlaConnectPayload = {
      connectionType: "api",
      siteUrl: trimmedSiteUrl,
      apiToken: apiToken.trim(),
    };
    const trimmedCategoryId = categoryId.trim();
    if (trimmedCategoryId) {
      payload.categoryId = Number(trimmedCategoryId);
    }
    onSave(payload);
  }

  return (
    <SimpleDialog
      open={open}
      title="Connect Joomla"
      titleId="joomla-connect-title"
      onClose={close}
      loading={saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps
          steps={[
            "Install the goals.ac Joomla plugin for HMAC publishing, or enable Web Services API tokens.",
            "Paste site URL plus site key (plugin) or API token (Web Services).",
            "Save and Run health check; set category if using the REST API.",
          ]}
        />
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["plugin", "api"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setConnectionType(method)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                connectionType === method
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {method === "plugin" ? "Plugin" : "Web Services API"}
            </button>
          ))}
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Site URL</span>
          <input
            type="url"
            value={siteUrl}
            onChange={(event) => setSiteUrl(event.target.value)}
            placeholder="https://example.com"
            className={inputClassName}
            autoComplete="url"
          />
          {siteUrlError ? <p className="mt-1 text-xs text-red-700">{siteUrlError}</p> : null}
        </label>

        {connectionType === "plugin" ? (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Site key</span>
            <input
              type="password"
              value={siteKey}
              onChange={(event) => setSiteKey(event.target.value)}
              className={inputClassName}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Copy the site key from the goals.ac Joomla plugin settings.
            </p>
          </label>
        ) : (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">API token</span>
              <input
                type="password"
                value={apiToken}
                onChange={(event) => setApiToken(event.target.value)}
                className={inputClassName}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Create a token under System → Web Services → API Tokens.
              </p>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Category ID (optional)</span>
              <input
                type="number"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                placeholder="2"
                className={inputClassName}
                min={1}
              />
            </label>
          </>
        )}

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

export function NotionConnectDialog({
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  onSave: (payload: NotionConnectPayload) => void;
}) {
  const [integrationToken, setIntegrationToken] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setIntegrationToken("");
    setDatabaseId("");
    setFormError(null);
  }

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function close() {
    if (saving) return;
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!integrationToken.trim() || !databaseId.trim()) {
      setFormError("Integration token and database ID are required");
      return;
    }

    setFormError(null);
    onSave({
      integrationToken: integrationToken.trim(),
      databaseId: databaseId.trim(),
    });
  }

  return (
    <SimpleDialog
      open={open}
      title="Connect Notion"
      titleId="notion-connect-title"
      onClose={close}
      loading={saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps
          steps={[
            "Create a Notion internal integration and copy the secret token.",
            "Share your CMS database with that integration, then paste the database ID.",
            "Save and Run health check — Notion must return the database.",
          ]}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Integration token</span>
          <input
            type="password"
            value={integrationToken}
            onChange={(event) => setIntegrationToken(event.target.value)}
            placeholder="secret_..."
            className={inputClassName}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Create an integration at notion.so/my-integrations and share your database with it.
          </p>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Database ID</span>
          <input
            type="text"
            value={databaseId}
            onChange={(event) => setDatabaseId(event.target.value)}
            placeholder="32-character hex ID from your database URL"
            className={inputClassName}
            autoComplete="off"
          />
        </label>

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

export function WebflowConnectDialog({
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  onSave: (payload: WebflowConnectPayload) => void;
}) {
  const [apiToken, setApiToken] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [bodyFieldSlug, setBodyFieldSlug] = useState("post-body");
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setApiToken("");
    setCollectionId("");
    setBodyFieldSlug("post-body");
    setFormError(null);
  }

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function close() {
    if (saving) return;
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!apiToken.trim() || !collectionId.trim()) {
      setFormError("API token and collection ID are required");
      return;
    }

    setFormError(null);
    onSave({
      apiToken: apiToken.trim(),
      collectionId: collectionId.trim(),
      bodyFieldSlug: bodyFieldSlug.trim() || "post-body",
    });
  }

  return (
    <SimpleDialog
      open={open}
      title="Connect Webflow"
      titleId="webflow-connect-title"
      onClose={close}
      loading={saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps
          steps={[
            "In Site Settings → Integrations → API access, generate a site token.",
            "Copy the CMS Collection ID for your blog (and optional body field slug).",
            "Save, then Run health check before first publish.",
          ]}
        />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">API token</span>
          <input
            type="password"
            value={apiToken}
            onChange={(event) => setApiToken(event.target.value)}
            placeholder="Webflow site API token"
            className={inputClassName}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Site Settings → Integrations → API access
          </p>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Collection ID</span>
          <input
            type="text"
            value={collectionId}
            onChange={(event) => setCollectionId(event.target.value)}
            placeholder="64-character collection ID"
            className={inputClassName}
            autoComplete="off"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Body field slug</span>
          <input
            type="text"
            value={bodyFieldSlug}
            onChange={(event) => setBodyFieldSlug(event.target.value)}
            placeholder="post-body"
            className={inputClassName}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Rich Text field slug in your collection (default: post-body).
          </p>
        </label>

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

export function ShopifyConnectDialog({
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  onSave: (payload: ShopifyConnectPayload) => void;
}) {
  const [connectionType, setConnectionType] = useState<"api" | "plugin">("api");
  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [siteKey, setSiteKey] = useState("");
  const [blogId, setBlogId] = useState("");
  const [siteUrlError, setSiteUrlError] = useState<string | null>(null);
  const [shopDomainError, setShopDomainError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function resetForm() {
    setConnectionType("api");
    setShopDomain("");
    setAccessToken("");
    setSiteUrl("");
    setSiteKey("");
    setBlogId("");
    setSiteUrlError(null);
    setShopDomainError(null);
    setFormError(null);
  }

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  function close() {
    if (saving) return;
    resetForm();
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedBlogId = blogId.trim();
    let valid = true;

    if (connectionType === "api") {
      const trimmedShopDomain = shopDomain.trim();
      if (!trimmedShopDomain) {
        setShopDomainError("Shop domain is required");
        valid = false;
      } else {
        setShopDomainError(null);
      }

      if (!accessToken.trim()) {
        setFormError("Admin API access token is required");
        valid = false;
      }
    } else {
      const trimmedSiteUrl = siteUrl.trim();
      if (!trimmedSiteUrl) {
        setSiteUrlError("App URL is required");
        valid = false;
      } else if (!isValidUrl(trimmedSiteUrl)) {
        setSiteUrlError("Enter a valid URL");
        valid = false;
      } else {
        setSiteUrlError(null);
      }

      if (!siteKey.trim()) {
        setFormError("Site key is required");
        valid = false;
      }
    }

    if (!valid) return;

    setFormError(null);
    if (connectionType === "api") {
      onSave({
        connectionType: "api",
        shopDomain: shopDomain.trim(),
        accessToken: accessToken.trim(),
        ...(trimmedBlogId ? { blogId: trimmedBlogId } : {}),
      });
    } else {
      onSave({
        connectionType: "plugin",
        siteUrl: siteUrl.trim(),
        siteKey: siteKey.trim(),
        ...(trimmedBlogId ? { blogId: trimmedBlogId } : {}),
      });
    }
  }

  return (
    <SimpleDialog
      open={open}
      title="Connect Shopify"
      titleId="shopify-connect-title"
      onClose={close}
      loading={saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps
          steps={[
            "Prefer Admin API: create a custom app with write_content and paste the shop domain + token.",
            "Or install the goals.ac plugin and paste the site URL + site key.",
            "Save and Run health check; set primary blog destination after connect.",
          ]}
        />
        <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {(["api", "plugin"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setConnectionType(method)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                connectionType === method
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {method === "api" ? "Admin API" : "Plugin"}
            </button>
          ))}
        </div>

        {connectionType === "api" ? (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Shop domain</span>
              <input
                type="text"
                value={shopDomain}
                onChange={(event) => setShopDomain(event.target.value)}
                placeholder="mystore.myshopify.com"
                className={inputClassName}
                autoComplete="off"
              />
              {shopDomainError ? (
                <p className="mt-1 text-xs text-red-700">{shopDomainError}</p>
              ) : null}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Admin API access token</span>
              <input
                type="password"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                className={inputClassName}
                autoComplete="off"
              />
            </label>
          </>
        ) : (
          <>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">App URL</span>
              <input
                type="url"
                value={siteUrl}
                onChange={(event) => setSiteUrl(event.target.value)}
                placeholder="https://your-store.myshopify.com"
                className={inputClassName}
                autoComplete="url"
              />
              {siteUrlError ? <p className="mt-1 text-xs text-red-700">{siteUrlError}</p> : null}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Site key</span>
              <input
                type="password"
                value={siteKey}
                onChange={(event) => setSiteKey(event.target.value)}
                className={inputClassName}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Copy the site key from the goals.ac Shopify app after installation.
              </p>
            </label>
          </>
        )}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Blog ID (optional)</span>
          <input
            type="text"
            value={blogId}
            onChange={(event) => setBlogId(event.target.value)}
            placeholder="gid://shopify/Blog/..."
            className={inputClassName}
            autoComplete="off"
          />
        </label>

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

export function CmsFullAppConnectDialog({
  open,
  platformLabel,
  platformKey,
  onOpenChange,
  fullAppIntegrationsUrl,
}: ConnectDialogBaseProps & {
  platformLabel: string;
  /** Platform key for platform-specific setup steps (e.g. contentful, typo3). */
  platformKey?: string;
  fullAppIntegrationsUrl?: string;
}) {
  function close() {
    onOpenChange(false);
  }

  return (
    <SimpleDialog
      open={open}
      title={`Connect ${platformLabel}`}
      titleId="cms-full-app-connect-title"
      onClose={close}
    >
      <div className="space-y-4 text-sm">
        <ConnectSetupSteps steps={getFullAppCmsSetupSteps(platformKey, platformLabel)} />
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
            onClick={close}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </SimpleDialog>
  );
}
