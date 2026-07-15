"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { AdminIntegrationsController } from "./use-admin-integrations-controller";
import { AdminStripeDialog } from "./admin-stripe-dialog";
import { AdminResendDialog } from "./admin-resend-dialog";
import { AdminUnsplashDialog } from "./admin-unsplash-dialog";
import { AdminPexelsDialog } from "./admin-pexels-dialog";
import { AdminLinkedInDialog } from "./admin-linkedin-dialog";
import { AdminEnvIntegrationDialog } from "./admin-env-integration-dialog";

export function AdminIntegrationsDialogs({
  controller,
}: {
  controller: AdminIntegrationsController;
}) {
  const { activeDialog, closeDialog } = controller;

  return (
    <Dialog open={activeDialog != null} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="max-w-lg gap-0 overflow-y-auto sm:max-w-xl max-h-[88vh]">
        {activeDialog === "stripe" ? <AdminStripeDialog controller={controller} /> : null}
        {activeDialog === "resend" ? <AdminResendDialog controller={controller} /> : null}
        {activeDialog === "unsplash" ? <AdminUnsplashDialog controller={controller} /> : null}
        {activeDialog === "pexels" ? <AdminPexelsDialog controller={controller} /> : null}
        {activeDialog === "linkedin" ? <AdminLinkedInDialog controller={controller} /> : null}
        <AdminEnvIntegrationDialog controller={controller} />
      </DialogContent>
    </Dialog>
  );
}
