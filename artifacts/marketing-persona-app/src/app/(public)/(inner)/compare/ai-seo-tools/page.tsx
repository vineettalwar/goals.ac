import type { Metadata } from "next";
import { ComparePageDynamic } from "@/components/marketing/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Compare AI SEO Tools — goals.ac",
  description: "How goals.ac compares to autopilot SEO tools on strategy, control, and pricing.",
};

export default function Page() {
  return <ComparePageDynamic />;
}
