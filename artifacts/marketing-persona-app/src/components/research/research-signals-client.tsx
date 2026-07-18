"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ResearchSignalsView } from "@workspace/app-shell/research";
import { useResearchSignalsController } from "./use-research-data";

export function ResearchSignalsClient() {
  const ctrl = useResearchSignalsController();

  return (
    <ResearchSignalsView
      projectId={ctrl.projectId != null ? String(ctrl.projectId) : null}
      threads={ctrl.threads}
      discovering={ctrl.discovering}
      error={ctrl.error}
      onDiscover={() => void ctrl.discover()}
      onCopyReply={() => toast.success("Reply copied to clipboard")}
      paths={ctrl.paths}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
