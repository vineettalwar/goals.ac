import { notFound } from "next/navigation";
import { getSession } from "@/auth";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import { loadWebsiteProjectForUser } from "@/lib/server/loaders";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const projectId = Number(id);
  if (Number.isNaN(projectId)) notFound();

  const userId = parseInt(session.user.id, 10);
  const project = await loadWebsiteProjectForUser(projectId, userId);
  if (!project) notFound();

  return <ProjectDetailClient projectId={id} initialProject={project} />;
}
