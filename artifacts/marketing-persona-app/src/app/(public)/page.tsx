import type { Metadata } from "next";
import { HomePageClient } from "@/components/marketing/home-page-client";

export const metadata: Metadata = {
  title: "goals.ac — AI-powered B2B content growth engine",
  description:
    "Generate custom 12-month growth roadmaps, create SEO-optimised articles tailored to your audience personas, and auto-publish to WordPress — no agency required.",
};

export default function HomePage() {
  return <HomePageClient />;
}
