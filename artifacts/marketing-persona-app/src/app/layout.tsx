import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { getSiteUrl } from "@/lib/site-url";

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
  title: { default: "goals.ac", template: "%s — goals.ac" },
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
      "AI-powered B2B content growth engine — persona-driven SEO articles, roadmaps, GEO audits, and CMS publishing.",
    sameAs: [],
  };

  return (
    <html lang="en" className={`${jakartaSans.variable} ${playfairDisplay.variable}`}>
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
