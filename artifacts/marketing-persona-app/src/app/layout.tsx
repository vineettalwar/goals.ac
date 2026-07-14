import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { getSiteUrl } from "@/lib/marketing/site-url";

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
