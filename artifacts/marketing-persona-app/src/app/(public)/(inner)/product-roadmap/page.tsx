import type { Metadata } from "next";
import { ProductRoadmapPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Product Roadmap | goals.ac",
  description: "See what's live, in beta, and coming soon on goals.ac.",
};

export default function Page() {
  return <ProductRoadmapPageDynamic />;
}
