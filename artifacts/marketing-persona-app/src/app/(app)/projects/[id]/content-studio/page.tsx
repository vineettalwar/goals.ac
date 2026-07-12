import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/page-skeleton";

const ContentStudioClient = dynamic(
  () =>
    import("@/components/content-studio/content-studio-client").then((m) => m.ContentStudioClient),
  { loading: () => <PageSkeleton /> },
);

export default async function ContentStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentStudioClient projectId={id} />;
}
