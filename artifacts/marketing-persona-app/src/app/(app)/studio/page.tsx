import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/active-project/cookie";

type StudioRedirectPageProps = {
  searchParams: Promise<{ project?: string }>;
};

export default async function StudioRedirectPage({ searchParams }: StudioRedirectPageProps) {
  const params = await searchParams;
  const queryProject = params.project?.trim();
  if (queryProject && /^\d+$/.test(queryProject)) {
    redirect(`/projects/${queryProject}/content-studio`);
  }

  const cookieStore = await cookies();
  const projectId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value;

  if (projectId) {
    redirect(`/projects/${projectId}/content-studio`);
  }

  redirect("/projects");
}
