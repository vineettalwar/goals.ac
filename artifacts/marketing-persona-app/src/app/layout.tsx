import type { Metadata } from "next";
import "./globals.css";
import { RootProviders } from "@/app/root-providers";
import { getSession } from "@/auth";
import { getSiteUrl } from "@/lib/marketing/site/site-url";
import { MARKETING_CRITICAL_CSS } from "@/lib/marketing/site/marketing-critical-css";
import { sanitizeJsonLd } from "@/lib/security/json-ld";
import { productThemeBootScript } from "@/lib/theme-path";

export const metadata: Metadata = {
  title: { default: "goals.ac", template: "%s | goals.ac" },
  description: "AI-powered B2B content growth engine. Grow faster with persona-driven SEO articles, roadmaps, and automated WordPress publishing.",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "https://goals.ac"),
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    siteName: "goals.ac",
    type: "website",
  },
};

const THEME_BOOT = productThemeBootScript({
  marketingStatic: process.env.MARKETING_STATIC === "1",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = process.env.MARKETING_STATIC === "1" ? null : await getSession();
  const siteUrl = getSiteUrl();
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "goals.ac",
    url: siteUrl,
    description:
      "AI-powered B2B content growth engine with persona-driven SEO articles, roadmaps, GEO audits, and CMS publishing.",
    sameAs: ["https://www.linkedin.com/company/goals-ac"],
  };

  return (
    <html
      lang="en"
      className="--font-sans-face --font-serif-face --font-mono-face"
      suppressHydrationWarning
    >
      <head>
        <script defer dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.higgs.ai" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.higgs.ai" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
        <link rel="preload" as="font" href="/fonts/ibm-plex-sans/IBMPlexSans[wdth,wght].ttf" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" as="font" href="/fonts/source-serif-4/SourceSerif4[opsz,wght].ttf" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" as="font" href="/fonts/ibm-plex-mono/IBMPlexMono-Regular.ttf" type="font/ttf" crossOrigin="anonymous" />
        {process.env.MARKETING_STATIC === "1" && (
          <style dangerouslySetInnerHTML={{ __html: MARKETING_CRITICAL_CSS }} />
        )}
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(organizationJsonLd) }}
        />
        <RootProviders session={session}>{children}</RootProviders>
      </body>
    </html>
  );
}
