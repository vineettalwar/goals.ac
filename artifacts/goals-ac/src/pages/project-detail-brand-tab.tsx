import { TabsContent } from "@/components/ui/tabs";
import { ProjectDetailBrandProfileTab } from "./project-detail-brand-profile-tab";
import { ProjectDetailBrandStyleTab } from "./project-detail-brand-style-tab";

export function ProjectDetailBrandTab({ ctx }: { ctx: Record<string, unknown> }) {
  return (
    <TabsContent value="brand" className="space-y-6">
      <ProjectDetailBrandProfileTab ctx={ctx} />
      <ProjectDetailBrandStyleTab ctx={ctx} />
    </TabsContent>
  );
}
