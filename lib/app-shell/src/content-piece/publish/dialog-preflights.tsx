import { ContentExportPanel } from "./export-panel";
import {
  getConnectionSummary,
  type CmsConnectionSnapshot,
  type PublishDestinationDefinition,
  type PublishDestinationId,
} from "../publish-destinations";
import { ShopifyThemeSnippetPreflight } from "./shopify-theme-snippet-preflight";
import { NotionWebflowMediaPreflight, Typo3MediaPreflight } from "./typo3-media-preflight";

export type PublishDialogAcks = {
  shopifyThemeSnippet: boolean;
  typo3MediaUpload: boolean;
  notionMedia: boolean;
  webflowMedia: boolean;
  ghostMedia: boolean;
  instagramMedia: boolean;
  joomlaMedia: boolean;
};

export function PublishDialogPreflights({
  publishing,
  plannedDate,
  isExportOnly,
  nativeCmsScheduling,
  selectedDestination,
  platform,
  connections,
  shopifyThemeLearnHref,
  pieceTitle,
  pieceBodyMarkdown,
  acks,
  onAck,
  showShopifyThemeSnippetWarning,
  showTypo3MediaUploadWarning,
  showNotionMediaWarning,
  showWebflowMediaWarning,
  showGhostMediaWarning,
  showInstagramMediaWarning,
  showJoomlaMediaWarning,
}: {
  publishing: boolean;
  plannedDate?: string | null;
  isExportOnly: boolean;
  nativeCmsScheduling: boolean;
  selectedDestination?: PublishDestinationDefinition;
  platform: PublishDestinationId;
  connections: CmsConnectionSnapshot | null;
  shopifyThemeLearnHref?: string;
  pieceTitle?: string | null;
  pieceBodyMarkdown?: string | null;
  acks: PublishDialogAcks;
  onAck: (key: keyof PublishDialogAcks, value: boolean) => void;
  showShopifyThemeSnippetWarning: boolean;
  showTypo3MediaUploadWarning: boolean;
  showNotionMediaWarning: boolean;
  showWebflowMediaWarning: boolean;
  showGhostMediaWarning: boolean;
  showInstagramMediaWarning: boolean;
  showJoomlaMediaWarning: boolean;
}) {
  return (
    <>
      {plannedDate && !isExportOnly ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Publish timing</p>
          <p className="text-sm text-muted-foreground">
            This piece is scheduled for <strong>{plannedDate}</strong>.
          </p>
          {nativeCmsScheduling ? (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong>Option 1:</strong> Mark Ready + keep scheduled — WordPress can honor
                native scheduling when supported by the connection.
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong>Option 2:</strong> Publish now — go live immediately (ignores scheduled
                date).
              </p>
            </>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong>Option 1:</strong> Mark Ready in the editor + keep scheduled — the
                goals.ac daily sweep publishes on that date (this CMS has no native schedule
                API).
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong>Option 2:</strong> Publish now — go live immediately (ignores scheduled
                date).
              </p>
            </>
          )}
        </div>
      ) : null}

      {selectedDestination && connections && !isExportOnly ? (
        <div className="space-y-1 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Connected {selectedDestination.label}</p>
          {getConnectionSummary(platform, connections) ? (
            <p className="text-muted-foreground">
              <code className="break-all rounded bg-muted px-1 text-xs">
                {getConnectionSummary(platform, connections)}
              </code>
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">{selectedDestination.description}</p>
        </div>
      ) : null}

      {showShopifyThemeSnippetWarning ? (
        <div className="space-y-2">
          <ShopifyThemeSnippetPreflight learnHref={shopifyThemeLearnHref} />
          <Ack
            checked={acks.shopifyThemeSnippet}
            disabled={publishing}
            onChange={(v) => onAck("shopifyThemeSnippet", v)}
          >
            Theme snippet installed — publish continues either way; check if you already pasted
            the Liquid into the theme.
          </Ack>
        </div>
      ) : null}

      {showTypo3MediaUploadWarning ? (
        <div className="space-y-2">
          <Typo3MediaPreflight />
          <Ack
            checked={acks.typo3MediaUpload}
            disabled={publishing}
            onChange={(v) => onAck("typo3MediaUpload", v)}
          >
            Understood — inline FAL works; publish continues. Upgrade extension for proper FAL
            references.
          </Ack>
        </div>
      ) : null}

      {showNotionMediaWarning ? (
        <div className="space-y-2">
          <NotionWebflowMediaPreflight platform="notion" />
          <Ack
            checked={acks.notionMedia}
            disabled={publishing}
            onChange={(v) => onAck("notionMedia", v)}
          >
            Understood — publish continues. Use stock image or paste HTTPS URL for featured
            image.
          </Ack>
        </div>
      ) : null}

      {showWebflowMediaWarning ? (
        <div className="space-y-2">
          <NotionWebflowMediaPreflight platform="webflow" />
          <Ack
            checked={acks.webflowMedia}
            disabled={publishing}
            onChange={(v) => onAck("webflowMedia", v)}
          >
            Understood — publish continues. Use stock image or paste HTTPS URL for featured
            image.
          </Ack>
        </div>
      ) : null}

      {showGhostMediaWarning ? (
        <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <p className="font-medium">Ghost featured image</p>
          <p>
            Ghost needs a public HTTPS image URL (data URIs are skipped). Publish continues
            without feature_image unless you attach HTTPS media.
          </p>
          <Ack
            checked={acks.ghostMedia}
            disabled={publishing}
            onChange={(v) => onAck("ghostMedia", v)}
            muted
          >
            Understood — continue without a usable Ghost feature image.
          </Ack>
        </div>
      ) : null}

      {showInstagramMediaWarning ? (
        <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          <p className="font-medium">Instagram image required</p>
          <p>
            Instagram publish needs a public HTTPS featured image. Attach one before publishing
            or acknowledge that publish may fail.
          </p>
          <Ack
            checked={acks.instagramMedia}
            disabled={publishing}
            onChange={(v) => onAck("instagramMedia", v)}
            muted
          >
            Understood — I will add an image or accept a publish error.
          </Ack>
        </div>
      ) : null}

      {showJoomlaMediaWarning ? (
        <div className="space-y-2">
          <NotionWebflowMediaPreflight platform="joomla" />
          <Ack
            checked={acks.joomlaMedia}
            disabled={publishing}
            onChange={(v) => onAck("joomlaMedia", v)}
          >
            Understood — publish continues. Joomla skips non-HTTPS featured images.
          </Ack>
        </div>
      ) : null}

      {isExportOnly && (platform === "medium" || platform === "substack") ? (
        <ContentExportPanel
          platform={platform}
          title={pieceTitle}
          bodyMarkdown={pieceBodyMarkdown}
        />
      ) : null}
    </>
  );
}

function Ack({
  checked,
  disabled,
  onChange,
  muted,
  children,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
  muted?: boolean;
  children: string;
}) {
  return (
    <label
      className={
        muted
          ? "flex items-start gap-2 text-muted-foreground"
          : "flex items-start gap-2 text-xs text-muted-foreground"
      }
    >
      <input
        type="checkbox"
        className="mt-0.5 rounded border-border"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>{children}</span>
    </label>
  );
}
