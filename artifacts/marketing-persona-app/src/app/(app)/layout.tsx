import type { Metadata } from "next";
import { getSession } from "@/auth";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ActiveProjectProvider } from "@/context/active-project";
import { ImpersonationBanner } from "@/components/admin/layout/impersonation-banner";
import { IntegrationHealthAlertBannerContainer } from "@/components/integrations/integration-health-alert-banner";
import { MfaComplianceGate } from "@/components/mfa/mfa-compliance-gate";
import { APP_SHELL_GUTTER, APP_SHELL_MAIN_OFFSET, APP_SHELL_STAGE } from "@workspace/app-shell/shell-constants";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.user.companyId == null && !session.impersonation && !session.supportOrganization) {
    redirect("/onboarding");
  }

  const sidebarRole = session.impersonatorRole ?? session.user.role;

  return (
    <ActiveProjectProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <SidebarNav
          userName={session.user.name ?? "User"}
          userEmail={session.user.email ?? ""}
          userRole={sidebarRole}
          orgRole={session.user.orgRole}
        />
        <div className={`${APP_SHELL_GUTTER} ${APP_SHELL_MAIN_OFFSET}`}>
          <ImpersonationBanner />
          <IntegrationHealthAlertBannerContainer />
          <MfaComplianceGate>
            <main className={APP_SHELL_STAGE}>{children}</main>
          </MfaComplianceGate>
        </div>
      </div>
    </ActiveProjectProvider>
  );
}
