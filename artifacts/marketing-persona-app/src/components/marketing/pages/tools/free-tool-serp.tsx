"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function charHint(len: number, min: number, max: number) {
  if (len === 0) return "empty";
  if (len < min) return "too short";
  if (len > max) return "too long";
  return "good";
}

/** Solid colors on black — opacity modifiers fail WCAG AA for text-xs. */
export function charHintClass(hint: string) {
  return hint === "good" ? "text-emerald-200" : "text-amber-100";
}

function serpUrlParts(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent)
      .join(" › ");
    return { host, path, origin: `${u.protocol}//${u.host}` };
  } catch {
    return { host: url, path: "", origin: url };
  }
}

/** Desktop Google organic result chrome (favicon · site · URL · blue title · snippet). */
export function GoogleSerpCard({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description: string;
}) {
  const { host, path, origin } = serpUrlParts(url);
  const siteLabel = host || "example.com";
  const displayTitle = title.trim() || "Untitled page";
  const displayDesc = description.trim() || "No meta description provided.";
  const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host || "example.com")}&sz=64`;

  return (
    <div
      className="rounded-xl bg-white px-4 py-3.5 shadow-sm font-[Arial,Helvetica,sans-serif]"
      style={{ maxWidth: 600 }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- external favicon, no next/image domain */}
        <img
          src={favicon}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-full bg-[#f1f3f4] object-contain p-1.5 shrink-0"
        />
        <div className="min-w-0 leading-tight">
          <p className="text-[14px] text-[#202124] truncate">{siteLabel}</p>
          <p className="text-[12px] text-[#4d5156] truncate">
            {origin}
            {path ? ` › ${path}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-[20px] leading-[1.3] text-[#1a0dab] hover:underline cursor-default line-clamp-2">
        {displayTitle}
      </p>
      <p className="mt-0.5 text-[14px] leading-[1.58] text-[#4d5156] line-clamp-2">{displayDesc}</p>
    </div>
  );
}

export function SerpPreview() {
  const [title, setTitle] = useState("Your Page Title | Brand Name");
  const [desc, setDesc] = useState(
    "A compelling meta description between 50 and 160 characters that summarizes your page for searchers and AI systems.",
  );
  const titleHint = charHint(title.length, 30, 60);
  const descHint = charHint(desc.length, 50, 160);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm text-white/80" htmlFor="serp-title">
          Page title
        </label>
        <Input
          id="serp-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Page title"
          className="h-12 text-base marketing-input-dark"
        />
        <p className={`text-xs ${charHintClass(titleHint)}`}>
          {title.length} characters · ideal 30–60 · {titleHint}
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm text-white/80" htmlFor="serp-desc">
          Meta description
        </label>
        <Textarea
          id="serp-desc"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="Meta description"
          className="text-base marketing-input-dark"
        />
        <p className={`text-xs ${charHintClass(descHint)}`}>
          {desc.length} characters · ideal 50–160 · {descHint}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70 mb-2">Google preview</p>
        <GoogleSerpCard
          url="https://yoursite.com/page"
          title={title}
          description={desc}
        />
      </div>
    </div>
  );
}
