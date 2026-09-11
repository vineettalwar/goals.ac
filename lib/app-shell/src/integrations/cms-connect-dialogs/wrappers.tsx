import type {
  DrupalConnectPayload,
  GhostConnectPayload,
  JoomlaConnectPayload,
  NotionConnectPayload,
  ShopifyConnectPayload,
  WebflowConnectPayload,
  WordPressConnectPayload,
} from "../cms-connect-types";
import { ConnectSetupSteps, getCmsSetupSteps } from "../connect-setup-steps";
import {
  drupalConfig,
  ghostConfig,
  joomlaConfig,
  notionConfig,
  shopifyConfig,
  webflowConfig,
  wordpressConfig,
} from "./configs";
import {
  SchemaConnectDialog,
  SimpleDialog,
  type ConnectDialogBaseProps,
} from "./shared";

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
