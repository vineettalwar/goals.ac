import type { Metadata } from "next";
import { ContentAutopilotClient } from "./content-autopilot-client";

export const metadata: Metadata = {
  title: "Content Autopilot — goals.ac",
  description: "Get 3 SEO articles and a 30-day content plan from your website URL. Automated publishing with editorial control.",
};

export default function Page() {
  return <ContentAutopilotClient />;
}
