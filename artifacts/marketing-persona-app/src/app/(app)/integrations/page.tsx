"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileEdit,
  Globe2,
  Layers3,
  Share2,
  Webhook as WebhookIcon,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { ConnectionManager } from "./connection-manager";
import { useCompany } from "@/lib/queries";

type CmsSummary = {
  linkedin?: boolean;
  twitter?: boolean;
  meta?: boolean;
  bluesky?: boolean;
  mastodon?: boolean;
};

const SOCIAL_PLATFORMS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    description: "Publish LinkedIn posts from Content Studio via OAuth.",
    helpSlug: "connect-linkedin",
    summaryKey: "linkedin" as const,
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    description: "Publish threads to X from Content Studio.",
    helpSlug: "connect-x-twitter",
    summaryKey: "twitter" as const,
  },
  {
    id: "meta",
    label: "Meta (Facebook + Instagram)",
    description: "Connect a Facebook Page and linked Instagram Business account.",
    helpSlug: "connect-meta-facebook-instagram",
    summaryKey: "meta" as const,
  },
  {
    id: "bluesky",
    label: "Bluesky",
    description: "Publish skeets via AT Protocol OAuth.",
    helpSlug: "connect-bluesky",
    summaryKey: "bluesky" as const,
  },
  {
    id: "mastodon",
    label: "Mastodon",
    description: "Publish toots to your Mastodon instance.",
    helpSlug: "connect-mastodon",
    summaryKey: "mastodon" as const,
  },
] as const;

export default function IntegrationsPage() {
  const { data: companyId, isLoading } = useCompany();
  const [cmsSummary, setCmsSummary] = useState<CmsSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/cms-summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCmsSummary(data))
      .finally(() => setSummaryLoading(false));
  }, []);

  return (
    <div className="px-8 py-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Publish generated content to CMS platforms and social networks. CMS credentials and social
          tokens are encrypted at rest.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Social publishing
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect per project on the Publishing tab. Status below reflects any connected project on
            your account.
          </p>
        </div>

        {SOCIAL_PLATFORMS.map((platform) => {
          const connected = cmsSummary?.[platform.summaryKey];
          return (
            <div key={platform.id} className="paper-card p-6 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
                  <Share2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold flex items-center gap-2 flex-wrap">
                    {platform.label}
                    {summaryLoading ? (
                      <Spinner size="sm" />
                    ) : connected ? (
                      <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
                        Connected
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{platform.description}</p>
                  <Link
                    href={`/help/${platform.helpSlug}`}
                    className="text-xs text-primary hover:underline mt-2 inline-block"
                  >
                    Setup guide →
                  </Link>
                </div>
              </div>
              <Link
                href="/projects"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
              >
                Projects <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        })}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">CMS publishing</h2>

      {/* WordPress */}
      <div className="paper-card p-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
            <Globe2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">WordPress</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Publish autopilot articles directly to your WordPress site via the REST API.
            </p>
          </div>
        </div>
        <Link
          href="/autopilot/settings"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
        >
          Manage <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Notion */}
      <div className="paper-card p-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
            <FileEdit className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              Notion
              <span className="rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">
                via project settings
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Content Studio pieces can publish to a Notion database. Connect it from a project&apos;s settings.
            </p>
          </div>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
        >
          Go to projects <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Webflow */}
      <div className="paper-card p-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
            <Layers3 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              Webflow
              <span className="rounded-full border border-border px-2 py-0.5 text-xs font-normal text-muted-foreground">
                via project settings
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Content Studio pieces can publish to a Webflow CMS collection. Connect it from a project&apos;s settings.
            </p>
          </div>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
        >
          Go to projects <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Ghost */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
            <Globe2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Ghost</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Publish via the Ghost Admin API, as a draft or a live post. Uses a signed short-lived token — your
              Admin API key never leaves our server.
            </p>
          </div>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Spinner size="sm" /> Loading…
          </p>
        ) : companyId ? (
          <ConnectionManager provider="ghost" companyId={companyId} />
        ) : (
          <p className="text-sm text-muted-foreground">No company found.</p>
        )}
      </div>

      {/* Webhook */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
            <WebhookIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Generic webhook</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              POST the full article (markdown, HTML, metadata, FAQ, citations, JSON-LD) to any URL — Zapier, Make,
              n8n, or your own stack. Every request is signed with an HMAC-SHA256 header.
            </p>
          </div>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Spinner size="sm" /> Loading…
          </p>
        ) : companyId ? (
          <ConnectionManager provider="webhook" companyId={companyId} />
        ) : (
          <p className="text-sm text-muted-foreground">No company found.</p>
        )}
      </div>
      </section>

      <p className="text-sm text-muted-foreground">
        Need setup instructions? Browse the{" "}
        <Link href="/help" className="text-primary hover:underline">
          Help center
        </Link>
        .
      </p>
    </div>
  );
}
