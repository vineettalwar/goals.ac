import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ProjectListItem } from "@workspace/app-shell";
import type { BrandProfile, WebsiteProject } from "@/types/api";

type ProjectsLoadState = {
  loading: boolean;
  error: string | null;
  projects: ProjectListItem[];
  quotaLabel: string | null;
  reload: () => Promise<void>;
};

function mapProjectRow(
  project: WebsiteProject,
  brand: BrandProfile | null,
): ProjectListItem {
  return {
    id: project.id,
    name: project.name,
    url: project.url,
    scrapeStatus: project.scrapeStatus ?? null,
    industry: brand?.industry ?? null,
  };
}

export function useProjectsData(): ProjectsLoadState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [quotaLabel, setQuotaLabel] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await apiFetch<WebsiteProject[]>("/api/website-projects");
      const enriched = await Promise.all(
        rows.map(async (project) => {
          const brand = await apiFetch<BrandProfile | null>(
            `/api/website-projects/${project.id}/brand-profile`,
          ).catch(() => null);
          return mapProjectRow(project, brand);
        }),
      );
      setProjects(enriched);
      setQuotaLabel(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, projects, quotaLabel, reload };
}
