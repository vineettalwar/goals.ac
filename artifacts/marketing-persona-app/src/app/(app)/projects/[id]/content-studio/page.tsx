import { ContentStudioClient } from "@/components/content-studio/content-studio-client";

export default async function ContentStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentStudioClient projectId={id} />;
}
