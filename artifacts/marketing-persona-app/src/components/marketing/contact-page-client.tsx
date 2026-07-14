"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { Button } from "@/components/ui/button";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { cardSurfaceClass } from "@/lib/marketing/marketing-surfaces";
import { CONTACT_CTA_PRIMARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";

const DEFAULT_CALENDLY_URL = "https://calendly.com/vineetsktalwar";
const glassCard = cardSurfaceClass("glass", false);

function calendlyEmbedSrc(url: string) {
  const parsed = new URL(url);
  parsed.searchParams.set("embed", "true");
  parsed.searchParams.set("hide_event_type_details", "1");
  parsed.searchParams.set("hide_gdpr_banner", "1");
  return parsed.toString();
}

const CALENDLY_EMBED_SRC = calendlyEmbedSrc(
  process.env.NEXT_PUBLIC_CALENDLY_URL ?? DEFAULT_CALENDLY_URL,
);

export function ContactPageClient() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function submitMessage(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, featureKey: "contact" }),
    });
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setStatus("done");
    setEmail("");
    setMessage("");
  }

  return (
    <MarketingPageShell
      hero={
        <PageHero
          badge="Contact"
          titleLine1="Talk to us"
          titleLine2="or book a demo"
          description="Questions about SEO, AEO, or GEO consulting? Book a discovery call or send us a message."
          backgroundImage={HERO_IMAGES.pricing.hero}
          ctas={[{ label: CONTACT_CTA_PRIMARY, href: CONTACT_HREF, variant: "primary" }]}
        />
      }
    >
      <MarketingSection bordered className="py-16">
        <div className="grid lg:grid-cols-[1fr_280px] gap-10 max-w-5xl mx-auto">
          <div className="space-y-8">
            <div className={`${glassCard} overflow-hidden`}>
              <iframe
                src={CALENDLY_EMBED_SRC}
                title="Book a demo with goals.ac"
                className="w-full min-h-[630px] border-0"
              />
            </div>

            <form onSubmit={submitMessage} className={`${glassCard} p-6 space-y-4`}>
              <h3 className="font-semibold text-white">Send a message</h3>
              <p className="text-sm text-white/65">
                Prefer email? Leave your address and we&apos;ll get back to you.
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="marketing-input-dark"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Tell us about your team and goals (optional)"
                className="marketing-input-dark min-h-[100px] py-3 h-auto resize-y"
              />
              <Button type="submit" disabled={status === "loading"} className="hero-cta-primary border-0">
                {status === "loading" ? "Sending…" : "Send message"}
              </Button>
              {status === "done" && (
                <p className="text-sm text-emerald-400">Thanks! We&apos;ll be in touch soon.</p>
              )}
              {status === "error" && (
                <p className="text-sm text-red-400">Something went wrong. Email hello@goals.ac directly.</p>
              )}
            </form>
          </div>

          <aside className="space-y-6">
            <div className={`${glassCard} p-6 space-y-4`}>
              <h3 className="font-semibold text-white">Email us</h3>
              <a
                href="mailto:contact@vineet.de"
                className="flex items-center gap-2 text-sm text-white/80 hover:text-white hover:underline"
              >
                <Mail className="h-4 w-4" />
                contact@vineet.de
              </a>
              <p className="text-xs text-white/50">Sales, demos, and consulting inquiries</p>
            </div>
            <div className={`${glassCard} p-6 space-y-3 text-sm text-white/65`}>
              <p>
                <span className="text-white/50">Privacy:</span>{" "}
                <a href="mailto:privacy@goals.ac" className="text-white/80 hover:text-white hover:underline">
                  privacy@goals.ac
                </a>
              </p>
              <p>
                <span className="text-white/50">Legal:</span>{" "}
                <a href="mailto:legal@goals.ac" className="text-white/80 hover:text-white hover:underline">
                  legal@goals.ac
                </a>
              </p>
            </div>
            <div className="text-sm text-white/50 space-y-2">
              <p>
                <Link href="/pricing" className="text-white/80 hover:text-white hover:underline">
                  View engagements
                </Link>
              </p>
              <p>
                <Link href="/free-tools" className="text-white/80 hover:text-white hover:underline">
                  Try free tools
                </Link>
              </p>
            </div>
          </aside>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  );
}
