"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

/**
 * Legacy standalone WordPress connect page, replaced by the `wordpress` step
 * inside the Typeform onboarding shell (see src/components/onboarding/steps/wordpress-step.tsx).
 * Kept reachable per the PRD rather than deleted: it now just hands off to the
 * new flow, which resumes each session at its own current step.
 */
export default function LegacyWordPressRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner size="lg" />
    </div>
  );
}
