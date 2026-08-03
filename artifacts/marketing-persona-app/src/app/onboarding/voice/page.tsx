"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

/** Legacy voice step removed — scrape runs in background; Studio gates generate. */
function VoiceRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const companyId = params.get("companyId");
  const projectId = params.get("projectId");

  useEffect(() => {
    if (companyId) {
      router.replace(`/onboarding/personas?companyId=${companyId}`);
      return;
    }
    if (projectId) {
      router.replace(`/projects/${projectId}`);
      return;
    }
    router.replace("/onboarding");
  }, [companyId, projectId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export default function OnboardingVoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <VoiceRedirect />
    </Suspense>
  );
}
