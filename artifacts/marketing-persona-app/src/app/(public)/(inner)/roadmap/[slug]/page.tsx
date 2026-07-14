import { permanentRedirect } from "next/navigation";

export default async function PublicRoadmapPage() {
  permanentRedirect("/content-engine");
}
