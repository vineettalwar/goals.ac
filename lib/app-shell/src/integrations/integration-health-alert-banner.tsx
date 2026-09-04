import { AlertTriangle, X } from "lucide-react";
import { cn } from "../cn";

export type IntegrationHealthAlertType = "reauth_required" | "connection_failing";

export type IntegrationHealthAlertItem = {
  id: number;
  platform: string;
  alertType: IntegrationHealthAlertType;
  message: string;
};

const PLATFORM_LABELS: Record<string, string> = {
  wordpress: "WordPress",
  ghost: "Ghost",
  shopify: "Shopify",
  webflow: "Webflow",
  notion: "Notion",
  drupal: "Drupal",
  joomla: "Joomla",
  webhook: "Webhook",
  wix: "Wix",
  framer: "Framer",
  squarespace: "Squarespace",
  contentful: "Contentful",
  sanity: "Sanity",
  strapi: "Strapi",
  hubspot: "HubSpot",
  typo3: "TYPO3",
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  meta: "Meta",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  beehiiv: "Beehiiv",
  convertkit: "ConvertKit",
  mailchimp: "Mailchimp",
};

export function platformDisplayName(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

function alertHeadline(alert: IntegrationHealthAlertItem): string {
  const platform = platformDisplayName(alert.platform);
  return alert.alertType === "reauth_required"
    ? `${platform} connection needs reauthorization`
    : `${platform} connection is failing health checks`;
}

export type IntegrationHealthAlertBannerProps = {
  alerts: IntegrationHealthAlertItem[];
  /** Link target for the primary action (e.g. the project's integrations settings page). */
  reconnectHref?: string;
  onDismiss?: (alertId: number) => void;
  dismissingId?: number | null;
  className?: string;
};

/**
 * Compact, dismissible banner surfacing open integration health alerts —
 * meant to render app-wide (e.g. in the app shell layout) so a failing
 * connection isn't only visible on the Integrations settings page.
 */
export function IntegrationHealthAlertBanner({
  alerts,
  reconnectHref,
  onDismiss,
  dismissingId,
  className,
}: IntegrationHealthAlertBannerProps) {
  if (alerts.length === 0) return null;

  const [primary, ...rest] = alerts;

  return (
    <div
      role="alert"
      className={cn(
        "sticky top-0 z-40 border-b border-red-500/40 bg-red-500/10 px-4 py-2",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <p className="min-w-0 truncate">
            <strong>{alertHeadline(primary!)}</strong>
            {rest.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                — and {rest.length} more connection{rest.length === 1 ? "" : "s"} need attention
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {reconnectHref && (
            <a
              href={reconnectHref}
              className="rounded-md border border-red-500/40 bg-background px-3 py-1 text-sm font-medium hover:bg-red-500/10"
            >
              Reconnect
            </a>
          )}
          <button
            type="button"
            onClick={() => onDismiss?.(primary!.id)}
            disabled={dismissingId === primary!.id}
            aria-label="Dismiss alert"
            className="rounded-md p-1 text-muted-foreground hover:bg-red-500/10 hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
