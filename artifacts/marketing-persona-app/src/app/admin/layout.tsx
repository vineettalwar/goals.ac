import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { AdminSidebarNav } from "@/components/admin/layout/admin-sidebar-nav";
import { ImpersonationBanner } from "@/components/admin/layout/impersonation-banner";
import { APP_SHELL_MAIN_OFFSET } from "@workspace/app-shell/shell-constants";

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
      <div className={`flex min-w-0 flex-1 flex-col overflow-hidden ${APP_SHELL_MAIN_OFFSET}`}>
        <ImpersonationBanner />
        <main className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">{children}</main>
      </div>
    </div>
  );
}
