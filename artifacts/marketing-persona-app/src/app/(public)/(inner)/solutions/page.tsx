import type { Metadata } from "next";
import { SolutionsPageDynamic } from "@/components/marketing/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Solutions — goals.ac",
  description: "AI search visibility, content strategy, authority building, and agency workflows for B2B growth teams.",
};

export default function Page() {
  return <SolutionsPageDynamic />;
}
