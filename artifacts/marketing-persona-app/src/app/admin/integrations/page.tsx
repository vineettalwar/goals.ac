import { AdminSectionLayout } from "@/components/admin/admin-section-layout";
import { AdminIntegrationsPanel } from "@/components/admin/admin-integrations-panel";

export default function AdminIntegrationsPage() {
  return (
    <AdminSectionLayout
      title="Integrations"
      description="Platform-wide billing and transactional email services."
      wide
    >
      <AdminIntegrationsPanel />
    </AdminSectionLayout>
  );
}
