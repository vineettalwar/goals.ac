import type { Metadata } from "next";
import { LearnPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Learn | SEO & GEO Academy | goals.ac",
  description: "Guides on GEO, AI citations, content strategy, and topical authority for B2B.",
};

export default function Page() {
  return <LearnPageDynamic />;
}
