import type { Metadata } from "next";
import { ContentAutopilotClient } from "./content-autopilot-client";

export const metadata: Metadata = {
  title: "Content Autopilot | goals.ac",
  description:
    "Scheduled content generation inside goals.ac consulting programs. Editorial control and CMS publishing included.",
};

export default function Page() {
  return <ContentAutopilotClient />;
}
