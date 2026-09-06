"use client";

import { CheckCircle2, Facebook, Globe, Instagram, Link2, Loader2, RefreshCw, Unlink } from "lucide-react";
import {
  ConnectSetupSteps,
  getSocialSetupSteps,
} from "@workspace/app-shell/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HealthBadge } from "./publishing-settings-cards";
import type { PublishingPendingAction } from "@/components/projects/publishing-settings-pending";

type MetaPageOption = {
  pageId: string;
  pageName: string;
  instagramUsername?: string;
};

type SharedSocialProps = {
  embedded?: boolean;
  healthStatus: Record<string, { ok: boolean; error?: string }> | null;
  pendingAction: PublishingPendingAction;
  onConnectOAuth: (path: string, params?: { handle?: string; instance?: string }) => void;
  onDisconnectSocial: (platform: "meta" | "bluesky" | "mastodon") => void;
};

export function PublishingSettingsMetaCard({
  embedded = false,
  metaIntegration,
  metaPageToken,
  metaPages,
  healthStatus,
  pendingAction,
  onConnectOAuth,
  onDisconnectSocial,
  onSelectMetaPage,
}: SharedSocialProps & {
  metaIntegration?: Record<string, unknown>;
  metaPageToken: string | null;
  metaPages: MetaPageOption[];
  onSelectMetaPage: (pageId: string) => void;
}) {
  return (
    <Card className={embedded ? "rounded-none border-0 bg-transparent shadow-none" : "border shadow-sm"}>
      <CardHeader className={embedded ? "px-0 pt-0" : undefined}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Facebook className="w-4 h-4 text-blue-700" />
              <Instagram className="w-4 h-4 text-fuchsia-600" />
              Facebook & Instagram
              {metaIntegration && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Requires a Facebook Page with a linked Instagram Business account.
              {embedded
                ? " Instagram posts need a public HTTPS image — Attach URL or Use stock image on the content piece."
                : " Instagram needs a public HTTPS image — Attach URL or Use stock image on the content piece (see Help)."}
            </CardDescription>
          </div>
          {metaIntegration && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDisconnectSocial("meta")}
              disabled={pendingAction === "disconnecting_meta"}
              className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              {pendingAction === "disconnecting_meta" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" aria-hidden />
                  Disconnecting…
                </>
              ) : (
                <>
                  <Unlink className="w-3.5 h-3.5 mr-1.5" aria-hidden />
                  Disconnect
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={embedded ? "px-0 pb-0" : undefined}>
        {metaPageToken && metaPages.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select a Facebook Page to connect:</p>
            {metaPages.map((page) => (
              <Button
                key={page.pageId}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={pendingAction === "selecting_meta_page"}
                onClick={() => onSelectMetaPage(page.pageId)}
              >
                <span className="font-medium">{page.pageName}</span>
                {page.instagramUsername && (
                  <span className="ml-2 text-xs text-muted-foreground">@{page.instagramUsername}</span>
                )}
              </Button>
            ))}
          </div>
        ) : metaIntegration ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Page:</span>{" "}
              {String(metaIntegration.pageName ?? metaIntegration.pageId)}
            </p>
            {metaIntegration.instagramUsername ? (
              <p>
                <span className="font-medium text-foreground">Instagram:</span> @
                {String(metaIntegration.instagramUsername)}
              </p>
            ) : null}
            <HealthBadge health={healthStatus?.meta} destinationName="Meta" />
            {healthStatus?.meta && !healthStatus.meta.ok ? (
              <Button size="sm" variant="outline" onClick={() => onConnectOAuth("meta")}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reconnect Meta
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <ConnectSetupSteps steps={getSocialSetupSteps("meta")} />
            <Button size="sm" onClick={() => onConnectOAuth("meta")}>
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Connect Meta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PublishingSettingsBlueskyCard({
  embedded = false,
  blueskyIntegration,
  blueskyHandle,
  healthStatus,
  pendingAction,
  onBlueskyHandleChange,
  onConnectOAuth,
  onDisconnectSocial,
}: SharedSocialProps & {
  blueskyIntegration?: Record<string, unknown>;
  blueskyHandle: string;
  onBlueskyHandleChange: (v: string) => void;
}) {
  return (
    <Card className={embedded ? "rounded-none border-0 bg-transparent shadow-none" : "border shadow-sm"}>
      <CardHeader className={embedded ? "px-0 pt-0" : undefined}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-sky-500" />
              Bluesky
              {blueskyIntegration && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Connect via AT Protocol OAuth to publish skeets from Content Studio.
            </CardDescription>
          </div>
          {blueskyIntegration && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDisconnectSocial("bluesky")}
              className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <Unlink className="w-3.5 h-3.5 mr-1.5" />
              Disconnect
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={embedded ? "px-0 pb-0" : undefined}>
        {blueskyIntegration ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Account:</span> @
              {String(blueskyIntegration.handle ?? blueskyIntegration.did ?? "connected")}
            </p>
            <HealthBadge health={healthStatus?.bluesky} destinationName="Bluesky" />
            {healthStatus?.bluesky && !healthStatus.bluesky.ok ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const handle = String(blueskyIntegration.handle ?? "");
                  if (handle) onConnectOAuth("bluesky", { handle });
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reconnect Bluesky
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <ConnectSetupSteps steps={getSocialSetupSteps("bluesky")} />
            <div className="space-y-1.5">
              <Label htmlFor={embedded ? "bluesky-handle-dialog" : "bluesky-handle"}>Bluesky handle</Label>
              <Input
                id={embedded ? "bluesky-handle-dialog" : "bluesky-handle"}
                placeholder="you.bsky.social"
                value={blueskyHandle}
                onChange={(e) => onBlueskyHandleChange(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={!blueskyHandle.trim()}
              onClick={() => onConnectOAuth("bluesky", { handle: blueskyHandle.trim() })}
            >
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Connect Bluesky
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PublishingSettingsMastodonCard({
  embedded = false,
  mastodonIntegration,
  mastodonInstance,
  healthStatus,
  onMastodonInstanceChange,
  onConnectOAuth,
  onDisconnectSocial,
}: SharedSocialProps & {
  mastodonIntegration?: Record<string, unknown>;
  mastodonInstance: string;
  onMastodonInstanceChange: (v: string) => void;
}) {
  return (
    <Card className={embedded ? "rounded-none border-0 bg-transparent shadow-none" : "border shadow-sm"}>
      <CardHeader className={embedded ? "px-0 pt-0" : undefined}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-violet-500" />
              Mastodon
              {mastodonIntegration && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Connect your Mastodon instance to publish toots from Content Studio.
            </CardDescription>
          </div>
          {mastodonIntegration && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDisconnectSocial("mastodon")}
              className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5"
            >
              <Unlink className="w-3.5 h-3.5 mr-1.5" />
              Disconnect
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={embedded ? "px-0 pb-0" : undefined}>
        {mastodonIntegration ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Account:</span> @
              {String(mastodonIntegration.username ?? "connected")}
            </p>
            <p>
              <span className="font-medium text-foreground">Instance:</span>{" "}
              {String(mastodonIntegration.instanceUrl ?? "")}
            </p>
            <HealthBadge health={healthStatus?.mastodon} destinationName="Mastodon" />
          </div>
        ) : (
          <div className="space-y-3">
            <ConnectSetupSteps steps={getSocialSetupSteps("mastodon")} />
            <div className="space-y-1.5">
              <Label htmlFor={embedded ? "mastodon-instance-dialog" : "mastodon-instance"}>
                Instance URL
              </Label>
              <Input
                id={embedded ? "mastodon-instance-dialog" : "mastodon-instance"}
                placeholder="mastodon.social"
                value={mastodonInstance}
                onChange={(e) => onMastodonInstanceChange(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={!mastodonInstance.trim()}
              onClick={() => onConnectOAuth("mastodon", { instance: mastodonInstance.trim() })}
            >
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Connect Mastodon
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PublishingSettingsExtraSocialCards(props: {
  metaIntegration?: Record<string, unknown>;
  blueskyIntegration?: Record<string, unknown>;
  mastodonIntegration?: Record<string, unknown>;
  healthStatus: Record<string, { ok: boolean; error?: string }> | null;
  pendingAction: PublishingPendingAction;
  metaPageToken: string | null;
  metaPages: MetaPageOption[];
  blueskyHandle: string;
  mastodonInstance: string;
  onBlueskyHandleChange: (v: string) => void;
  onMastodonInstanceChange: (v: string) => void;
  onConnectOAuth: (path: string, params?: { handle?: string; instance?: string }) => void;
  onDisconnectSocial: (platform: "meta" | "bluesky" | "mastodon") => void;
  onSelectMetaPage: (pageId: string) => void;
}) {
  const shared = {
    healthStatus: props.healthStatus,
    pendingAction: props.pendingAction,
    onConnectOAuth: props.onConnectOAuth,
    onDisconnectSocial: props.onDisconnectSocial,
  };

  return (
    <>
      <PublishingSettingsMetaCard
        {...shared}
        metaIntegration={props.metaIntegration}
        metaPageToken={props.metaPageToken}
        metaPages={props.metaPages}
        onSelectMetaPage={props.onSelectMetaPage}
      />
      <PublishingSettingsBlueskyCard
        {...shared}
        blueskyIntegration={props.blueskyIntegration}
        blueskyHandle={props.blueskyHandle}
        onBlueskyHandleChange={props.onBlueskyHandleChange}
      />
      <PublishingSettingsMastodonCard
        {...shared}
        mastodonIntegration={props.mastodonIntegration}
        mastodonInstance={props.mastodonInstance}
        onMastodonInstanceChange={props.onMastodonInstanceChange}
      />
    </>
  );
}
