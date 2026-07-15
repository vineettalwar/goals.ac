import { AdminSectionLayout } from "@/components/admin/layout/admin-section-layout";
import { PlatformOperationsPanel } from "@/components/admin/platform/platform-operations-panel";

export default function AdminPlatformPage() {
  return (
    <AdminSectionLayout
      title="Platform"
      description="System-wide access, AI gates, signups, and maintenance messaging."
    >
      <div className="max-w-2xl rounded-xl border border-border px-6 py-2">
        <PlatformOperationsPanel />
      </div>
    </AdminSectionLayout>
  );
}
