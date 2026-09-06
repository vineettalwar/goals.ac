"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleSerpCard, charHint, charHintClass } from "./free-tool-serp";
import type { LlmsResult, MetaResult, RobotsResult, SitemapResult } from "./free-tool-types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="border-white/20 bg-white/5 text-white hover:bg-white/10"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          Copy
        </>
      )}
    </Button>
  );
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export function MetaResultView({ data }: { data: MetaResult }) {
  const scoreColor =
    data.score >= 80 ? "text-emerald-200" : data.score >= 50 ? "text-amber-100" : "text-red-300";
  const titleHint = charHint(data.titleLen, 30, 60);
  const descHint = charHint(data.descLen, 50, 160);

  return (
    <div className="space-y-5 pt-2 border-t border-white/10">
      <div className="flex items-end gap-3">
        <p className={`text-5xl font-semibold tabular-nums ${scoreColor}`}>{data.score}</p>
        <p className="text-sm text-white/70 pb-1">/ 100</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70 mb-2">
          How it looks on Google
        </p>
        <GoogleSerpCard
          url={data.url}
          title={data.pageTitle ?? ""}
          description={data.metaDescription ?? ""}
        />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className={charHintClass(titleHint)}>
            Title {data.titleLen} chars · ideal 30–60 · {titleHint}
          </span>
          <span className={charHintClass(descHint)}>
            Description {data.descLen} chars · ideal 50–160 · {descHint}
          </span>
        </div>
      </div>

      {data.h1 != null && (
        <div className="text-sm">
          <p className="text-white/70 text-xs uppercase tracking-wide mb-1">H1</p>
          <p className="text-white">{data.h1 || "— missing —"}</p>
        </div>
      )}

      {data.issues.length > 0 ? (
        <ul className="space-y-2">
          {data.issues.map((issue) => (
            <li
              key={issue}
              className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-sm text-amber-50"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-200" />
              {issue}
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          Title and description look solid
        </p>
      )}
    </div>
  );
}

export function LlmsResultView({ data }: { data: LlmsResult }) {
  const checks = data.checks ?? [];
  const sourceLabel =
    data.pageSource === "sitemap" ? "sitemap URLs" : "homepage links";
  const passCount = checks.filter((c) => c.ok).length;

  return (
    <div className="space-y-5 pt-2 border-t border-white/10">
      <div
        className={`rounded-lg px-4 py-3 text-sm ${
          data.existingFound
            ? "border border-amber-500/25 bg-amber-500/10 text-amber-50"
            : "border border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
        }`}
      >
        {data.existingFound
          ? "Your site already has /llms.txt — review the draft below before replacing it."
          : "No /llms.txt at the site root yet. Copy or download the draft and publish it there."}
      </div>

      <div className="grid sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70 mb-1">Pages listed</p>
          <p className="text-2xl font-semibold tabular-nums text-white">{data.pageCount}</p>
          <p className="text-xs text-white/70 mt-0.5">from {sourceLabel}</p>
        </div>
        <div className="sm:col-span-2 min-w-0">
          <p className="text-xs uppercase tracking-wide text-white/70 mb-1">Site</p>
          <p className="text-white font-medium truncate">{data.title || "—"}</p>
          <p className="text-xs text-white/75 mt-1 line-clamp-2">
            {data.description || "No meta description found — edit the summary line in the draft."}
          </p>
        </div>
      </div>

      {checks.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70 mb-2">
            Readiness · {passCount}/{checks.length}
          </p>
          <ul className="space-y-2">
            {checks.map((check) => (
              <li
                key={check.id}
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                {check.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-300" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-200" />
                )}
                <div className="min-w-0">
                  <p className="text-white font-medium">{check.label}</p>
                  {check.detail ? (
                    <p className="text-xs text-white/70 mt-0.5">{check.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/80">Generated draft</p>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={data.content} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            onClick={() => downloadText("llms.txt", data.content)}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
        </div>
      </div>
      <pre className="text-xs bg-black/40 rounded-lg p-4 overflow-x-auto max-h-96 text-white/90 whitespace-pre-wrap font-mono">
        {data.content}
      </pre>

      {data.existingFound && data.existingContent ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-white/75 hover:text-white">
            Current /llms.txt on the site
          </summary>
          <div className="mt-2 flex justify-end">
            <CopyButton text={data.existingContent} />
          </div>
          <pre className="mt-2 text-xs bg-black/40 rounded-lg p-4 overflow-x-auto max-h-64 text-white/85 whitespace-pre-wrap font-mono">
            {data.existingContent}
          </pre>
        </details>
      ) : null}

      <div>
        <p className="text-xs uppercase tracking-wide text-white/70 mb-2">Publish checklist</p>
        <ol className="space-y-2 text-sm text-white/85 list-decimal list-inside">
          <li>
            Save the file as <code className="text-white/95">llms.txt</code> at your domain root (
            <code className="text-white/95">https://yoursite.com/llms.txt</code>).
          </li>
          <li>Keep the H1 title and blockquote summary accurate — that is what models read first.</li>
          <li>List only priority pages (product, pricing, docs, flagship articles), not every URL.</li>
          <li>
            Confirm robots.txt does not block AI crawlers you care about — use the{" "}
            <Link href="/free-tools/robots-txt" className="text-(--accent-warm) hover:underline">
              robots checker
            </Link>
            .
          </li>
        </ol>
      </div>
    </div>
  );
}

export function RobotsResultView({ data }: { data: RobotsResult }) {
  const agents = data.agents ?? [];
  const flagged = data.flaggedAgents ?? [];
  return (
    <div className="space-y-4 pt-2 border-t border-white/10">
      <div
        className={`rounded-lg px-4 py-3 text-sm ${
          data.allowsAll
            ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
            : "border border-red-500/25 bg-red-500/10 text-red-100"
        }`}
      >
        {data.allowsAll
          ? "Default (*) rules do not block the whole site"
          : "Default (*) rules Disallow / — most crawlers are blocked"}
      </div>
      {flagged.length > 0 && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Full-site block for: {flagged.join(", ")}
        </div>
      )}
      {agents.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-white/70">Per user-agent</p>
          {agents.map((agent) => (
            <div
              key={agent.userAgents.join(",")}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="font-medium text-white font-mono text-xs">{agent.userAgents.join(", ")}</p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    agent.blocksAll ? "bg-red-500/20 text-red-200" : "bg-emerald-500/20 text-emerald-200"
                  }`}
                >
                  {agent.blocksAll ? "Blocks /" : "Open"}
                </span>
              </div>
              <p className="text-xs text-white/70 mb-1">Disallow ({agent.disallows.length})</p>
              {agent.disallows.length === 0 ? (
                <p className="text-white/75 text-xs">None</p>
              ) : (
                <ul className="space-y-0.5 max-h-28 overflow-y-auto text-white/90 font-mono text-xs">
                  {agent.disallows.slice(0, 20).map((d, i) => (
                    <li key={`${d}-${i}`}>{d || "(empty = allow all)"}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70 mb-2">
              Disallow rules ({data.disallows.length})
            </p>
            {data.disallows.length === 0 ? (
              <p className="text-white/75">None found</p>
            ) : (
              <ul className="space-y-1 max-h-40 overflow-y-auto text-white/90 font-mono text-xs">
                {data.disallows.slice(0, 30).map((d) => (
                  <li key={d}>{d || "(empty)"}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-wide text-white/70 mb-2">
          Sitemap refs ({data.sitemapUrls.length})
        </p>
        {data.sitemapUrls.length === 0 ? (
          <p className="text-white/75 text-sm">None declared</p>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-y-auto text-white/90 text-xs break-all">
            {data.sitemapUrls.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        )}
      </div>
      {data.content ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-white/75 hover:text-white">Raw robots.txt</summary>
          <pre className="mt-2 text-xs bg-black/40 rounded-lg p-4 overflow-x-auto max-h-64 text-white/85 whitespace-pre-wrap font-mono">
            {data.content}
          </pre>
        </details>
      ) : (
        <p className="text-sm text-white/75">No robots.txt found at {data.url}</p>
      )}
    </div>
  );
}

export function SitemapResultView({ data }: { data: SitemapResult }) {
  return (
    <div className="space-y-4 pt-2 border-t border-white/10">
      <div className="flex items-end gap-3">
        <p className="text-5xl font-semibold tabular-nums text-white">{data.urlCount}</p>
        <p className="text-sm text-white/70 pb-1">URLs in sitemap</p>
      </div>
      <p className="text-xs text-white/70 break-all">{data.url}</p>
      {data.sitemapType && (
        <p className="text-xs text-white/75">
          Type: {data.sitemapType === "sitemapindex" ? "sitemap index (children followed)" : "urlset"}
        </p>
      )}
      {data.errors.length > 0 && (
        <ul className="space-y-2">
          {data.errors.map((err) => (
            <li
              key={err}
              className="flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-sm text-red-100"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              {err}
            </li>
          ))}
        </ul>
      )}
      {data.urls.length > 0 && (
        <ul className="space-y-1 max-h-64 overflow-y-auto text-xs text-white/85 break-all">
          {data.urls.map((u) => (
            <li key={u} className="py-1 border-b border-white/5 last:border-0">
              {u}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
