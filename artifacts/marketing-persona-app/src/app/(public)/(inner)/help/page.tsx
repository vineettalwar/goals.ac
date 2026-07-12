import type { Metadata } from "next";
import { HelpPageDynamic } from "@/components/marketing/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Help — Setup & Publishing — goals.ac",
  description: "Connect LinkedIn, X, Meta, Bluesky, and Mastodon. Self-hosted OAuth setup guides.",
};

export default function Page() {
  return <HelpPageDynamic />;
}
