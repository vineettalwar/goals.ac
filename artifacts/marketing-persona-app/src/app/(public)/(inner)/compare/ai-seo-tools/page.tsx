import type { Metadata } from "next";
import { ComparePageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Compare AI SEO Tools | goals.ac",
  description: "How a consulting-led GEO program compares to autopilot SEO tools on strategy, control, and editorial oversight.",
};

export default function Page() {
  return <ComparePageDynamic />;
}
