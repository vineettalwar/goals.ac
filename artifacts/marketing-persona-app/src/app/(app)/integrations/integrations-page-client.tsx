"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  OrgAiProvidersPanel,
  OrgIntegrationsView,
  OrgToolsPanel,
  type OrgIntegrationsTab,
} from "@workspace/app-shell/integrations";
import { isSiteAdmin, isSuperAdmin } from "@workspace/app-shell/nav-roles";
import {
  orgIntegrationsPath,
  projectIntegrationsPath,
} from "@workspace/app-shell/project-detail";
import { useActiveProject } from "@/context/use-active-project";
import { PublicApiKeysPanel } from "@/components/settings/public-api-keys-panel";
import { useSettingsData } from "@/hooks/use-settings-data";
import { useOrgByokControllers } from "@/hooks/use-org-byok-controllers";

const VALID_TABS: OrgIntegrationsTab[] = ["ai", "tools"];

function parseTab(value: string | undefined): OrgIntegrationsTab {
  if (value && VALID_TABS.includes(value as OrgIntegrationsTab)) {
    return value as OrgIntegrationsTab;
  }
  return "ai";
}

export function IntegrationsPageClient({ tab }: { tab: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { activeProjectId } = useActiveProject();
  const {
    aiSummary,
    integrationsSummary,
    reload,
    userRole,
    orgRole,
    canManageAiSettings: initialCanManage,
  } = useSettingsData();
  const byok = useOrgByokControllers(reload);

  const canManageProviderKeys =
    initialCanManage ??
    (isSuperAdmin(userRole) ||
      isSiteAdmin(orgRole) ||
      isSuperAdmin(session?.user?.role) ||
      isSiteAdmin(session?.user?.orgRole));

  const activeTab = parseTab(tab);

  return (
    <OrgIntegrationsView
      activeTab={activeTab}
      onTabChange={(next) => router.push(orgIntegrationsPath(next))}
      projectIntegrationsHref={
        activeProjectId != null ? projectIntegrationsPath(activeProjectId) : null
      }
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
          footerNote={<PublicApiKeysPanel canManage={canManageProviderKeys} />}
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
          Project CMS, social, email, and search connections live under each project — use the
          <span className="font-medium text-foreground"> Project integrations </span>
          card above
          {activeProjectId == null ? (
            <>
              {" "}
              or{" "}
              <Link href="/projects" className="text-primary hover:underline">
                choose a project
              </Link>
            </>
          ) : null}
          . Need setup instructions?{" "}
          <Link href="/help" className="text-primary hover:underline">
            Help center
          </Link>
          .
        </p>
      }
    />
  );
}
