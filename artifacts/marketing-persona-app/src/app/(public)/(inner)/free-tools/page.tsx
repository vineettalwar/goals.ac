import type { Metadata } from "next";
import { FreeToolsPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Free SEO & GEO Tools | goals.ac",
  description: "Free GEO audit, meta checker, llms.txt generator, robots.txt checker, sitemap validator, and SERP preview.",
};

export default function Page() {
  return <FreeToolsPageDynamic />;
}
