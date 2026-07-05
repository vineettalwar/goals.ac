"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileEdit, Globe2, Layers3, Webhook as WebhookIcon } from "lucide-react";
import { ConnectionManager } from "./connection-manager";

export default function IntegrationsPage() {
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then(({ companies }) => {
        if (companies?.[0]) setCompanyId(companies[0].id);
      });
  }, []);

  return (
    <div className="px-8 py-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Publish generated articles straight to your CMS or stack. Every connection is encrypted at rest and
          verified before it&apos;s saved.
        </p>
      </div>

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
        {companyId ? (
          <ConnectionManager provider="ghost" companyId={companyId} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading...</p>
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
        {companyId ? (
          <ConnectionManager provider="webhook" companyId={companyId} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}
      </div>
    </div>
  );
}
