"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { PageHero } from "@/components/marketing/page-hero";
import { MarketingSection } from "@/components/marketing/marketing-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HERO_IMAGES } from "@/lib/marketing/marketing-hero-images";
import { CONTACT_CTA_PRIMARY, CONTACT_CTA_SECONDARY, CONTACT_HREF } from "@/lib/marketing/marketing-contact";

const DEFAULT_CALENDLY_URL = "https://calendly.com/vineetsktalwar";

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
      <MarketingSection variant="paper" bordered className="py-16 bg-background">
        <div className="grid lg:grid-cols-[1fr_280px] gap-10 max-w-5xl mx-auto">
          <div className="space-y-8">
            <div className="paper-card overflow-hidden rounded-2xl">
              <iframe
                src={CALENDLY_EMBED_SRC}
                title="Book a demo with goals.ac"
                className="w-full min-h-[630px] border-0"
              />
            </div>

            <form onSubmit={submitMessage} className="paper-card p-6 space-y-4 rounded-2xl">
              <h3 className="font-semibold">Send a message</h3>
              <p className="text-sm text-muted-foreground">
                Prefer email? Leave your address and we&apos;ll get back to you.
              </p>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Tell us about your team and goals (optional)"
              />
              <Button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Sending…" : "Send message"}
              </Button>
              {status === "done" && (
                <p className="text-sm text-green-600">Thanks! We&apos;ll be in touch soon.</p>
              )}
              {status === "error" && (
                <p className="text-sm text-destructive">Something went wrong. Email hello@goals.ac directly.</p>
              )}
            </form>
          </div>

          <aside className="space-y-6">
            <div className="paper-card p-6 rounded-2xl space-y-4">
              <h3 className="font-semibold">Email us</h3>
              <a
                href="mailto:contact@vineet.de"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                contact@vineet.de
              </a>
              <p className="text-xs text-muted-foreground">Sales, demos, and consulting inquiries</p>
            </div>
            <div className="paper-card p-6 rounded-2xl space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Privacy:</span>{" "}
                <a href="mailto:privacy@goals.ac" className="text-primary hover:underline">
                  privacy@goals.ac
                </a>
              </p>
              <p>
                <span className="text-muted-foreground">Legal:</span>{" "}
                <a href="mailto:legal@goals.ac" className="text-primary hover:underline">
                  legal@goals.ac
                </a>
              </p>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <Link href="/pricing" className="text-primary hover:underline">
                  View engagements
                </Link>
              </p>
              <p>
                <Link href="/free-tools" className="text-primary hover:underline">
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
