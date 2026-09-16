import type { Metadata } from "next";
import { LegalPageClient } from "@/components/marketing/pages/company/legal-page-client";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Accessibility statement for goals.ac: WCAG 2.1 AA target, BITV 2.0 / EN 301 549 orientation, how to report barriers.",
  robots: { index: true, follow: true },
};

export default function AccessibilityPage() {
  return (
    <LegalPageClient titleLine1="Accessibility" titleLine2="statement" lastUpdated="September 17, 2026">
      <p className="text-sm text-white/65 leading-relaxed">
        Some Tech Work UG (haftungsbeschränkt) aims to make goals.ac usable with keyboard, screen
        readers, and zoom. The technical bar we design against is{" "}
        <strong className="text-white/80">WCAG 2.1 Level AA</strong> (EN 301 549). In Germany that
        maps to BITV 2.0 for public-sector sites. We are a private B2B SaaS, not a public body, so
        BITV does not apply as a statutory duty to this product. The Barrierefreiheitsstärkungsgesetz
        (BFSG / EAA) from June 2025 targets consumer-facing services; goals.ac is sold to
        businesses, not consumers. This page is still published so procurement and users know the
        target and how to report a barrier.
      </p>
      <p className="text-sm text-white/65 leading-relaxed">
        We do <strong className="text-white/80">not</strong> claim BITV certification, a VPAT, or
        WCAG AAA. PRODUCT.md records AAA as an aspiration, AA as the floor.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">What is in place</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-white/65 leading-relaxed">
          <li>Skip link to main content on marketing pages</li>
          <li>Semantic landmarks (nav, main, footer) on the marketing shell</li>
          <li>Document language set to English (product UI is English)</li>
          <li>Essential-cookie notice is dismissible with a real button, not a color-only control</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Known limits</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          The product editor and charts are dense. Some third-party CMS previews and generated
          diagrams may fail contrast or keyboard checks. We have not completed a formal BITV test
          with a certified auditor or with disabled users. Automated scans are not a substitute.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Feedback</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Report a barrier:{" "}
          <a className="text-(--accent-warm) hover:underline" href="mailto:legal@goals.ac">
            legal@goals.ac
          </a>
          . Include the URL, the assistive tech you use, and what you could not do. We aim to reply
          within 10 working days.
        </p>
      </section>
    </LegalPageClient>
  );
}
