"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { LeadCaptureModal } from "@/components/lead-capture-modal";

export function RoadmapLeadCTA({ slug }: { slug: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="paper-card rounded-xl p-6 text-center space-y-4">
        <p className="font-semibold text-lg">Want a roadmap tailored to your business?</p>
        <p className="text-sm text-muted-foreground">
          Sign up free and generate a custom strategy in minutes — or get hands-on help from our team.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Get your free roadmap <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 border border-border bg-background px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Get expert help
          </button>
        </div>
      </div>

      <LeadCaptureModal roadmapSlug={slug} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
