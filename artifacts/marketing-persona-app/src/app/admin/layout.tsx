import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { AdminSidebarNav } from "@/components/admin/layout/admin-sidebar-nav";
import { ImpersonationBanner } from "@/components/admin/layout/impersonation-banner";
import { APP_SHELL_GUTTER, APP_SHELL_MAIN_OFFSET, APP_SHELL_STAGE } from "@workspace/app-shell/shell-constants";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requirePlatformAdmin();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebarNav
        userName={session.user.name ?? "Admin"}
        userEmail={session.user.email ?? ""}
      />
      <div className={`${APP_SHELL_GUTTER} ${APP_SHELL_MAIN_OFFSET}`}>
        <ImpersonationBanner />
        <main className={APP_SHELL_STAGE}>{children}</main>
      </div>
    </div>
  );
}
