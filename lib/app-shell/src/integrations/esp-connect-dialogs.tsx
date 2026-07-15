import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { ConnectSetupSteps, ESP_CONNECT_STEPS } from "./connect-setup-steps";

export type BeehiivConnectPayload = {
  apiKey: string;
  publicationId: string;
};

export type ConvertKitConnectPayload = {
  apiSecret: string;
  formId?: string;
};

export type MailchimpConnectPayload = {
  apiKey: string;
  serverPrefix: string;
  listId: string;
};

const inputClassName =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20";

type SimpleDialogProps = {
  open: boolean;
  title: string;
  titleId: string;
  onClose: () => void;
  loading?: boolean;
  children: React.ReactNode;
};

function SimpleDialog({ open, title, titleId, onClose, loading, children }: SimpleDialogProps) {
  if (!open) return null;

  function close() {
    if (loading) return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="paper-card relative z-10 w-full max-w-md p-6 shadow-lg"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close dialog"
            onClick={close}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type ConnectDialogBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
};

function DialogActions({
  saving,
  onCancel,
  submitLabel = "Connect",
}: {
  saving: boolean;
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
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
        {saving ? "Connecting…" : submitLabel}
      </button>
    </div>
  );
}

export function BeehiivConnectDialog({
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  onSave: (payload: BeehiivConnectPayload) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [publicationId, setPublicationId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setApiKey("");
      setPublicationId("");
      setFormError(null);
    }
  }, [open]);

  function close() {
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!apiKey.trim() || !publicationId.trim()) {
      setFormError("API key and publication ID are required");
      return;
    }
    setFormError(null);
    onSave({ apiKey: apiKey.trim(), publicationId: publicationId.trim() });
  }

  return (
    <SimpleDialog
      open={open}
      title="Connect Beehiiv"
      titleId="beehiiv-connect-title"
      onClose={close}
      loading={saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps steps={ESP_CONNECT_STEPS.beehiiv} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">API key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className={inputClassName}
            autoComplete="off"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Publication ID</span>
          <input
            type="text"
            value={publicationId}
            onChange={(event) => setPublicationId(event.target.value)}
            className={inputClassName}
            autoComplete="off"
          />
        </label>
        {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
        <DialogActions saving={saving} onCancel={close} />
      </form>
    </SimpleDialog>
  );
}

export function ConvertKitConnectDialog({
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  onSave: (payload: ConvertKitConnectPayload) => void;
}) {
  const [apiSecret, setApiSecret] = useState("");
  const [formId, setFormId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setApiSecret("");
      setFormId("");
      setFormError(null);
    }
  }, [open]);

  function close() {
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!apiSecret.trim()) {
      setFormError("API secret is required");
      return;
    }
    setFormError(null);
    onSave({
      apiSecret: apiSecret.trim(),
      formId: formId.trim() || undefined,
    });
  }

  return (
    <SimpleDialog
      open={open}
      title="Connect ConvertKit"
      titleId="convertkit-connect-title"
      onClose={close}
      loading={saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps steps={ESP_CONNECT_STEPS.convertkit} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">API secret</span>
          <input
            type="password"
            value={apiSecret}
            onChange={(event) => setApiSecret(event.target.value)}
            className={inputClassName}
            autoComplete="off"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Form ID (optional)</span>
          <input
            type="text"
            value={formId}
            onChange={(event) => setFormId(event.target.value)}
            className={inputClassName}
            autoComplete="off"
          />
        </label>
        {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
        <DialogActions saving={saving} onCancel={close} />
      </form>
    </SimpleDialog>
  );
}

export function MailchimpConnectDialog({
  open,
  onOpenChange,
  saving = false,
  onSave,
}: ConnectDialogBaseProps & {
  onSave: (payload: MailchimpConnectPayload) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [serverPrefix, setServerPrefix] = useState("");
  const [listId, setListId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setApiKey("");
      setServerPrefix("");
      setListId("");
      setFormError(null);
    }
  }, [open]);

  function close() {
    onOpenChange(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!apiKey.trim() || !serverPrefix.trim() || !listId.trim()) {
      setFormError("API key, server prefix, and audience list ID are required");
      return;
    }
    setFormError(null);
    onSave({
      apiKey: apiKey.trim(),
      serverPrefix: serverPrefix.trim(),
      listId: listId.trim(),
    });
  }

  return (
    <SimpleDialog
      open={open}
      title="Connect Mailchimp"
      titleId="mailchimp-connect-title"
      onClose={close}
      loading={saving}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ConnectSetupSteps steps={ESP_CONNECT_STEPS.mailchimp} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">API key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className={inputClassName}
            autoComplete="off"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Server prefix</span>
          <input
            type="text"
            value={serverPrefix}
            onChange={(event) => setServerPrefix(event.target.value)}
            placeholder="us1"
            className={inputClassName}
            autoComplete="off"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Audience list ID</span>
          <input
            type="text"
            value={listId}
            onChange={(event) => setListId(event.target.value)}
            className={inputClassName}
            autoComplete="off"
          />
        </label>
        {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
        <DialogActions saving={saving} onCancel={close} />
      </form>
    </SimpleDialog>
  );
}

export function EspFullAppConnectDialog({
  open,
  platformLabel,
  onOpenChange,
  fullAppIntegrationsUrl,
}: ConnectDialogBaseProps & {
  platformLabel: string;
  fullAppIntegrationsUrl?: string;
}) {
  function close() {
    onOpenChange(false);
  }

  return (
    <SimpleDialog
      open={open}
      title={`Connect ${platformLabel}`}
      titleId="esp-full-app-connect-title"
      onClose={close}
    >
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          {platformLabel} uses OAuth or advanced setup.
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
            to configure this platform.
          </p>
        ) : (
          <p>Open Integrations to configure this platform.</p>
        )}
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
