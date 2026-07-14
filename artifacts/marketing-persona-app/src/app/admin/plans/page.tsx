import { AdminPlansPanel } from "@/components/admin/admin-plans-panel";
import { AdminSectionLayout } from "@/components/admin/admin-section-layout";

export default function AdminPlansPage() {
  return (
    <AdminSectionLayout
      title="Plans"
      description="Subscription tiers and quota limits enforced across the platform."
    >
      <AdminPlansPanel />
    </AdminSectionLayout>
  );
}
