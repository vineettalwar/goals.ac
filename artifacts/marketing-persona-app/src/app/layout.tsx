import type { Metadata } from "next";
import "./globals.css";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";

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
  return (
    <html lang="en" className={`${jakartaSans.variable} ${playfairDisplay.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
