"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveProject } from "@/context/active-project";
import { Spinner } from "@/components/ui/spinner";

export default function StudioRedirectPage() {
  const router = useRouter();
  const { activeProjectId, isLoading } = useActiveProject();

  useEffect(() => {
    if (isLoading) return;
    if (activeProjectId) {
      router.replace(`/projects/${activeProjectId}/content-studio`);
      return;
    }
    router.replace("/projects");
  }, [isLoading, activeProjectId, router]);

  return (
    <div className="flex items-center justify-center p-16">
      <Spinner size="lg" />
    </div>
  );
}
