import { SyncActiveProjectFromUrl } from "@/components/app/sync-active-project-from-url";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <SyncActiveProjectFromUrl projectId={id} />
      {children}
    </>
  );
}
