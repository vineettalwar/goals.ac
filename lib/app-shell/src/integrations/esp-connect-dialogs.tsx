import { ConnectSetupSteps, ESP_CONNECT_STEPS } from "./connect-setup-steps";
import {
  inputClassName,
  SchemaConnectDialog,
  SimpleDialog,
  type ConnectDialogConfig,
  type FieldDef,
} from "./cms-connect-dialogs";

// ---------------------------------------------------------------------------
// ESP payload types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ESP configs
// ---------------------------------------------------------------------------

type ConnectDialogBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving?: boolean;
};

const beehiivConfig: ConnectDialogConfig<BeehiivConnectPayload> = {
  id: "beehiiv",
  title: "Connect Beehiiv",
  setupSteps: ESP_CONNECT_STEPS.beehiiv,
  fields: [
    { key: "apiKey", label: "API key", type: "password" },
    { key: "publicationId", label: "Publication ID", type: "text" },
  ],
  buildPayload(v) {
    return { apiKey: v.apiKey.trim(), publicationId: v.publicationId.trim() };
  },
};

const convertkitConfig: ConnectDialogConfig<ConvertKitConnectPayload> = {
  id: "convertkit",
  title: "Connect ConvertKit",
  setupSteps: ESP_CONNECT_STEPS.convertkit,
  fields: [
    { key: "apiSecret", label: "API secret", type: "password" },
    { key: "formId", label: "Form ID (optional)", type: "text", required: false },
  ],
  buildPayload(v) {
    return { apiSecret: v.apiSecret.trim(), formId: v.formId?.trim() || undefined };
  },
};

const mailchimpConfig: ConnectDialogConfig<MailchimpConnectPayload> = {
  id: "mailchimp",
  title: "Connect Mailchimp",
  setupSteps: ESP_CONNECT_STEPS.mailchimp,
  fields: [
    { key: "apiKey", label: "API key", type: "password" },
    { key: "serverPrefix", label: "Server prefix", type: "text", placeholder: "us1" },
    { key: "listId", label: "Audience list ID", type: "text" },
  ],
  buildPayload(v) {
    return { apiKey: v.apiKey.trim(), serverPrefix: v.serverPrefix.trim(), listId: v.listId.trim() };
  },
};

// ---------------------------------------------------------------------------
// Public ESP dialog exports
// ---------------------------------------------------------------------------

export function BeehiivConnectDialog(props: ConnectDialogBaseProps & { onSave: (p: BeehiivConnectPayload) => void }) {
  return <SchemaConnectDialog config={beehiivConfig} {...props} />;
}

export function ConvertKitConnectDialog(props: ConnectDialogBaseProps & { onSave: (p: ConvertKitConnectPayload) => void }) {
  return <SchemaConnectDialog config={convertkitConfig} {...props} />;
}

export function MailchimpConnectDialog(props: ConnectDialogBaseProps & { onSave: (p: MailchimpConnectPayload) => void }) {
  return <SchemaConnectDialog config={mailchimpConfig} {...props} />;
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
  return (
    <SimpleDialog
      open={open}
      title={`Connect ${platformLabel}`}
      titleId="esp-full-app-connect-title"
      onClose={() => onOpenChange(false)}
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
