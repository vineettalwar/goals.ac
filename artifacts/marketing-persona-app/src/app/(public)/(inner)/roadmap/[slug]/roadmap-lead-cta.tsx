"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Headphones } from "lucide-react";
import { LeadCaptureModal } from "@/components/lead-capture-modal";
import { CONTACT_CTA_PRIMARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";

export function RoadmapLeadCTA({ slug }: { slug: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="paper-card rounded-xl p-6 text-center space-y-4">
        <p className="font-semibold text-lg">Want a roadmap tailored to your business?</p>
        <p className="text-sm text-muted-foreground">
          Custom roadmaps are part of our consulting engagements — book a call to scope yours.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={CONTACT_HREF}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {CONTACT_CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 border border-border bg-background px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            <Headphones className="h-4 w-4 text-primary" />
            Get expert help
          </button>
        </div>
      </div>

      <LeadCaptureModal roadmapSlug={slug} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
