import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { RootProviders } from "@/app/root-providers";
import { getSession } from "@/auth";
import { getSiteUrl } from "@/lib/marketing/site/site-url";
import { MARKETING_CRITICAL_CSS } from "@/lib/marketing/site/marketing-critical-css";
import { sanitizeJsonLd } from "@/lib/security/json-ld";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400", "500", "600"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "goals.ac", template: "%s | goals.ac" },
  description: "AI-powered B2B content growth engine. Grow faster with persona-driven SEO articles, roadmaps, and automated WordPress publishing.",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "https://goals.ac"),
  openGraph: {
    siteName: "goals.ac",
    type: "website",
  },
  ...(process.env.MARKETING_STATIC === "1"
    ? { robots: { index: false, follow: false } }
    : {}),
};

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
    <html lang="en" className={`${jakartaSans.variable} ${playfairDisplay.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');if(s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
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
