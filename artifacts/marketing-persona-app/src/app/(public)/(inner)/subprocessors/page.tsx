import type { Metadata } from "next";
import { LegalPageClient } from "@/components/marketing/pages/company/legal-page-client";

export const metadata: Metadata = {
  title: "Subprocessors",
  description: "Third parties that may process goals.ac customer data.",
  robots: { index: true, follow: true },
};

export default function SubprocessorsPage() {
  return (
    <LegalPageClient titleLine1="Sub" titleLine2="processors" lastUpdated="September 16, 2026">
      <p className="text-sm text-white/65 leading-relaxed">
        Depending on which features you enable, Some Tech Work UG may use these processors. BYOK means your own contract with the provider applies to that traffic.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm text-white/65 leading-relaxed">
        <li>Cloudflare, Inc. — hosting, Workers, D1, Pages, DNS, CDN</li>
        <li>Stripe, Inc. — subscription billing and tax calculation</li>
        <li>Resend — transactional email when configured</li>
        <li>Google — Gemini (platform or BYOK), OAuth, Search Console, Analytics</li>
        <li>Amazon Web Services — Bedrock when selected</li>
        <li>OpenAI, Anthropic, OpenRouter, Groq, NVIDIA — AI when selected or BYOK</li>
        <li>DataForSEO / Semrush — rank and keyword tools when connected</li>
        <li>CMS destinations you configure (WordPress, Shopify, Ghost, Webflow, Notion, webhooks) — publish payloads you send</li>
      </ul>
    </LegalPageClient>
  );
}
