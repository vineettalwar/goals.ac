import { permanentRedirect } from "next/navigation";

export function generateStaticParams() {
  return [{ slug: "legacy" }];
}

export const dynamicParams = false;

export default async function PublicRoadmapPage() {
  permanentRedirect("/content-engine");
}
