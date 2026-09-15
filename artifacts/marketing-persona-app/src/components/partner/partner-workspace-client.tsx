import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_SHELL_PAGE_WIDE } from "@workspace/app-shell/shell-constants";

export type PartnerProjectRow = {
  id: number;
  name: string;
  url: string | null;
  publishedCount: number;
  draftCount: number;
  draftsNeedingReview: number;
  generatingPieces: number;
  recentPublishFail: number;
};

type Props = {
  projects: PartnerProjectRow[];
};

export function PartnerWorkspaceClient({ projects }: Props) {
  return (
    <div className={`${APP_SHELL_PAGE_WIDE} space-y-6`}>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          What needs work across every site: drafts, reviews, failed publishes.
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="paper-card px-6 py-14 text-center">
          <p className="font-medium">No sites yet</p>
          <p className="mx-auto mt-1 mb-4 max-w-sm text-sm text-muted-foreground">
            Add a site on Projects. It shows up here.
          </p>
          <Button asChild>
            <Link href="/projects">Go to Projects</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium tabular-nums">Published</th>
                <th className="px-4 py-3 font-medium tabular-nums">Drafts</th>
                <th className="px-4 py-3 font-medium tabular-nums">Needs review</th>
                <th className="px-4 py-3 font-medium tabular-nums">Generating</th>
                <th className="px-4 py-3 font-medium tabular-nums">Publish fails</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/25"
                >
                  <td className="px-4 py-3.5">
                    <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                    <p className="mt-0.5 max-w-70 truncate text-xs text-muted-foreground">
                      {project.url ?? "No URL"}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 tabular-nums">{project.publishedCount}</td>
                  <td className="px-4 py-3.5 tabular-nums text-muted-foreground">
                    {project.draftCount}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums font-medium">
                    {project.draftsNeedingReview}
                  </td>
                  <td className="px-4 py-3.5 tabular-nums text-muted-foreground">
                    {project.generatingPieces}
                  </td>
                  <td
                    className={`px-4 py-3.5 tabular-nums ${
                      project.recentPublishFail > 0 ? "font-medium text-rose-700" : ""
                    }`}
                  >
                    {project.recentPublishFail}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Open <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
