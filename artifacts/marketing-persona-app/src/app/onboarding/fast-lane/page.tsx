import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { FastLaneClient } from "./fast-lane-client";

export default async function FastLanePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  if (!projectId) {
    redirect("/onboarding");
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>}>
      <FastLaneClient projectId={projectId} />
    </Suspense>
  );
}
