"use client";

import Link from "next/link";
import { Suspense } from "react";
import { ResearchCompetitorsView } from "@workspace/app-shell/research";
import { PageSkeleton } from "@/components/skeletons/page-skeleton";
import { useResearchCompetitorsController } from "./use-research-data";

function ResearchCompetitorsInner() {
  const ctrl = useResearchCompetitorsController();

  return (
    <ResearchCompetitorsView
      analyses={ctrl.analyses}
      loading={ctrl.loading}
      error={ctrl.error}
      form={ctrl.form}
      onFormChange={ctrl.setForm}
      onAnalyze={() => void ctrl.analyze()}
      analyzing={ctrl.analyzing}
      result={ctrl.result}
      resultLoading={ctrl.resultLoading}
      selectedId={ctrl.selectedId}
      onSelect={ctrl.setSelectedId}
      formOpen={ctrl.formOpen}
      onFormOpenChange={ctrl.setFormOpen}
      paths={ctrl.paths}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}

export function ResearchCompetitorsClient() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ResearchCompetitorsInner />
    </Suspense>
  );
}
