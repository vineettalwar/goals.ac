import { useEffect } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ProjectDetailNotFound,
  ProjectDetailView,
  isProjectDetailTab,
  type ProjectDetailTab,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { useIntegrationsData } from "@/hooks/use-integrations-data";
import { useProjectDetailData } from "@/hooks/use-project-detail-data";

function parseTab(value: string | null): ProjectDetailTab {
  if (value && isProjectDetailTab(value)) return value;
  return "brand";
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setProjectId } = useActiveProject();
  const activeTab = parseTab(searchParams.get("tab"));

  const {
    loading,
    error,
    notFound,
    project,
    brandProfile,
    contentStyle,
    pieces,
    contentCount,
    rescanning,
    rescan,
    saveBrand,
    savingBrand,
    saveVoice,
    savingVoice,
  } = useProjectDetailData(id);
  const { integrations } = useIntegrationsData(id ?? null);
  const connectedPlatforms = Object.entries(integrations)
    .filter(([, row]) => row?.connected)
    .map(([key]) => key);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (id) setProjectId(id);
  }, [id, setProjectId]);

  function changeTab(tab: ProjectDetailTab) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  }

  if ((authLoading && !user) || (loading && !project)) {
    return <p className="p-8 text-muted-foreground">Loading project…</p>;
  }

  if (notFound) {
    return (
      <ProjectDetailNotFound
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
      />
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl px-8 py-8">
        <p className="mb-4 text-sm text-red-700">{error}</p>
        <Link to="/projects" className="text-sm font-medium text-primary hover:underline">
          ← Back to projects
        </Link>
      </div>
    );
  }

  if (!project) {
    return <p className="p-8 text-muted-foreground">Loading project…</p>;
  }

  return (
    <ProjectDetailView
      project={project}
      activeTab={activeTab}
      onTabChange={changeTab}
      contentCount={contentCount}
      brandProfile={brandProfile}
      contentStyle={contentStyle}
      pieces={pieces}
      onRescan={rescan}
      rescanning={rescanning}
      onSaveBrand={saveBrand}
      savingBrand={savingBrand}
      onSaveVoice={saveVoice}
      savingVoice={savingVoice}
      connectedPlatforms={connectedPlatforms}
      renderLink={({ href, className, children }) => (
        <Link to={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
