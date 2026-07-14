"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Headphones } from "lucide-react";
import { LeadCaptureModal } from "@/components/shared/lead-capture-modal";
import { cardSurfaceClass } from "@/lib/marketing/site/marketing-surfaces";

const glassCard = cardSurfaceClass("glass", false);

export function RoadmapLeadCTA({ slug }: { slug: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className={`${glassCard} p-6 text-center space-y-4`}>
        <p className="font-semibold text-lg text-white">Want this roadmap tied to your site and goals?</p>
        <p className="text-sm text-white/65">
          Sign in to generate a version grounded in your brand scan, or talk to us about hands-on strategy.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup?next=/strategy/roadmaps" className="hero-cta-primary inline-flex items-center gap-2">
            Generate for my business <ArrowRight className="h-4 w-4" />
          </Link>
          <button type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 border border-white/30 bg-white/10 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
          >
            <Headphones className="h-4 w-4" />
            Get expert help
          </button>
        </div>
      </div>

      <LeadCaptureModal roadmapSlug={slug} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
