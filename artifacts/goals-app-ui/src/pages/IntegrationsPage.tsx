import { useEffect } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  OrgAiProvidersPanel,
  OrgIntegrationsView,
  OrgToolsPanel,
  isSiteAdmin,
  isSuperAdmin,
  orgIntegrationsPath,
  projectIntegrationsPath,
  type OrgIntegrationsTab,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useActiveProject } from "@/hooks/use-active-project";
import { useOrgByokControllers } from "@/hooks/use-org-byok-controllers";
import { useSettingsData } from "@/hooks/use-settings-data";

const VALID_TABS: OrgIntegrationsTab[] = ["ai", "tools"];
const PROJECT_TABS = new Set(["cms", "social", "esp", "search"]);

function parseTab(value: string | undefined): OrgIntegrationsTab | null {
  if (value && VALID_TABS.includes(value as OrgIntegrationsTab)) {
    return value as OrgIntegrationsTab;
  }
  return null;
}

export function IntegrationsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const [searchParams] = useSearchParams();
  const { projectId } = useActiveProject();
  const {
    aiSummary,
    integrationsSummary,
    reload: reloadSettings,
    userRole,
    orgRole,
  } = useSettingsData();
  const byok = useOrgByokControllers(reloadSettings);

  const canManageProviderKeys = isSuperAdmin(userRole) || isSiteAdmin(orgRole);
  const activeTab = parseTab(tabParam);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const legacyTab = searchParams.get("tab");
    const legacyProject = searchParams.get("project");
    if (legacyTab && PROJECT_TABS.has(legacyTab)) {
      const target = legacyProject || projectId;
      if (target) {
        navigate(
          projectIntegrationsPath(target, legacyTab as "cms" | "social" | "esp" | "search"),
          { replace: true },
        );
        return;
      }
      navigate("/projects", { replace: true });
      return;
    }
    if (legacyProject) {
      navigate(projectIntegrationsPath(legacyProject, "cms"), { replace: true });
    }
  }, [searchParams, navigate, projectId]);

  if (authLoading) {
    return <p className="p-8 text-muted-foreground">Loading…</p>;
  }

  if (!user) return null;

  if (!tabParam) {
    return <Navigate to={orgIntegrationsPath("ai")} replace />;
  }

  if (!activeTab) {
    return <Navigate to={orgIntegrationsPath("ai")} replace />;
  }

  return (
    <OrgIntegrationsView
      activeTab={activeTab}
      onTabChange={(tab) => navigate(orgIntegrationsPath(tab))}
      aiPanel={
        <OrgAiProvidersPanel
          aiSummary={aiSummary}
          canManageGeminiKey={canManageProviderKeys}
          canManageProviderKeys={canManageProviderKeys}
          canManageProvider={canManageProviderKeys}
          onSaveGeminiKey={byok.saveGeminiKey}
          onDeleteGeminiKey={byok.deleteGeminiKey}
          onTestGeminiKey={byok.testGeminiKey}
          geminiSaving={byok.geminiSaving}
          geminiDeleting={byok.geminiDeleting}
          onSaveOpenaiKey={byok.saveOpenaiKey}
          onDeleteOpenaiKey={byok.deleteOpenaiKey}
          onTestOpenaiKey={byok.testOpenaiKey}
          openaiSaving={byok.openaiSaving}
          openaiDeleting={byok.openaiDeleting}
          onSaveAnthropicKey={byok.saveAnthropicKey}
          onDeleteAnthropicKey={byok.deleteAnthropicKey}
          onTestAnthropicKey={byok.testAnthropicKey}
          anthropicSaving={byok.anthropicSaving}
          anthropicDeleting={byok.anthropicDeleting}
          onSaveBedrockCredentials={byok.saveBedrockCredentials}
          onDeleteBedrockCredentials={byok.deleteBedrockCredentials}
          onTestBedrockCredentials={byok.testBedrockCredentials}
          bedrockSaving={byok.bedrockSaving}
          bedrockDeleting={byok.bedrockDeleting}
          onSaveProvider={byok.saveProvider}
          providerSaving={byok.providerSaving}
          providerMessage={byok.providerMessage}
        />
      }
      toolsPanel={
        <OrgToolsPanel
          integrationsSummary={integrationsSummary}
          canManage={canManageProviderKeys}
          onSaveSemrushCredentials={byok.saveSemrushCredentials}
          onDeleteSemrushCredentials={byok.deleteSemrushCredentials}
          onTestSemrushCredentials={byok.testSemrushCredentials}
          semrushSaving={byok.semrushSaving}
          semrushDeleting={byok.semrushDeleting}
          onSaveDeeplKey={byok.saveDeeplKey}
          onDeleteDeeplKey={byok.deleteDeeplKey}
          onTestDeeplKey={byok.testDeeplKey}
          deeplSaving={byok.deeplSaving}
          deeplDeleting={byok.deeplDeleting}
          onSaveStockCredentials={byok.saveStockCredentials}
          onDeleteStockCredentials={byok.deleteStockCredentials}
          onTestStockCredentials={byok.testStockCredentials}
          stockSavingProvider={byok.stockSavingProvider}
          stockRemovingProvider={byok.stockRemovingProvider}
          message={byok.toolsMessage}
        />
      }
      footer={
        <p className="text-sm text-muted-foreground">
          Project CMS, social, email, and search connections live on each project&apos;s integrations
          page
          {projectId ? (
            <>
              {" — "}
              <Link to={projectIntegrationsPath(projectId)} className="text-primary hover:underline">
                open current project
              </Link>
            </>
          ) : (
            <>
              {" — "}
              <Link to="/projects" className="text-primary hover:underline">
                choose a project
              </Link>
            </>
          )}
          .
        </p>
      }
    />
  );
}
