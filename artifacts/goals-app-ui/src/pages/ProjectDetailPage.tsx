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

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (id) setProjectId(id);
  }, [id, setProjectId]);

  function changeTab(tab: ProjectDetailTab) {
    setSearchParams({ tab }, { replace: true });
  }

  if (authLoading || loading) {
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
      renderLink={({ href, className, children }) => (
        <Link to={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
