import type { Metadata } from "next";
import "./globals.css";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { RootProviders } from "@/app/root-providers";
import { getSession } from "@/auth";
import { getSiteUrl } from "@/lib/marketing/site/site-url";
import { MARKETING_CRITICAL_CSS } from "@/lib/marketing/site/marketing-critical-css";
import { sanitizeJsonLd } from "@/lib/security/json-ld";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-face",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif-face",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-face",
  display: "swap",
});

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

const THEME_BOOT =
  process.env.MARKETING_STATIC === "1"
    ? `(function(){try{document.documentElement.classList.remove('dark');}catch(e){}})();`
    : `(function(){try{var p=location.pathname||'';var app=/^\\/(dashboard|projects|studio|settings|admin|content-piece|content-pieces|onboarding|audit|research|search|strategy|integrations|growth-roadmaps|partner|autopilot)(\\/|$)/.test(p);if(!app){document.documentElement.classList.remove('dark');return;}var s=localStorage.getItem('theme');if(s!=='light'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

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
      className={`${plexSans.variable} ${sourceSerif.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.higgs.ai" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.higgs.ai" />
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
