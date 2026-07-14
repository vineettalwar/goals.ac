import type { Metadata } from "next";
import dynamic from "next/dynamic";

const HomePageClient = dynamic(
  () => import("@/components/marketing/home-page-client").then((m) => m.HomePageClient),
  {
    loading: () => (
      <div className="min-h-screen animate-pulse bg-black">
        <div className="h-[70vh] bg-white/5" />
        <div className="mx-auto max-w-5xl px-6 py-16 space-y-6">
          <div className="h-8 w-64 rounded bg-white/10" />
          <div className="h-4 w-full max-w-xl rounded bg-white/5" />
        </div>
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: "goals.ac — Rank on Google and get cited by ChatGPT",
  description:
    "AI-powered B2B content growth: 12-month roadmaps, GEO-ready articles, AI visibility tracking, and CMS publishing with editorial control.",
};

export default function HomePage() {
  return <HomePageClient />;
}
