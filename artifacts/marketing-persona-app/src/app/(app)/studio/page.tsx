import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_PROJECT_COOKIE } from "@/lib/active-project/cookie";

export default async function StudioRedirectPage() {
  const cookieStore = await cookies();
  const projectId = cookieStore.get(ACTIVE_PROJECT_COOKIE)?.value;

  if (projectId) {
    redirect(`/projects/${projectId}/content-studio`);
  }

  redirect("/projects");
}
