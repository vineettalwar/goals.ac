import { AdminSectionLayout } from "@/components/admin/layout/admin-section-layout";
import { AdminContentStrategiesClient } from "./admin-client";

export default function AdminContentStrategiesPage() {
  return (
    <AdminSectionLayout
      title="Content pipeline"
      description="Support console for customer 30-day content calendars — find an org, inspect progress, and manually generate or schedule items."
    >
      <AdminContentStrategiesClient />
    </AdminSectionLayout>
  );
}
