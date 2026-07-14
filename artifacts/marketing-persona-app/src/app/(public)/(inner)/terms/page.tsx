import type { Metadata } from "next";
import { LegalPageClient } from "@/components/marketing/pages/legal-page-client";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for goals.ac: AI content generation, autopilot publishing, and growth tooling.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPageClient titleLine1="Terms of" titleLine2="service" lastUpdated="July 5, 2026">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Service description</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          goals.ac provides AI-assisted growth strategy and content generation tools, including
          persona-driven SEO article generation, a humanization pass for article quality, a content
          strategy and topical map planner, and integrations that publish generated content to
          WordPress, Ghost, or a generic webhook you configure. You are responsible for reviewing and
          approving generated content before publishing it anywhere.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Accounts</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          You are responsible for securing your login credentials and any API keys you provide. You must
          provide accurate account information, keep it up to date, and comply with applicable laws. You
          must be legally able to enter into a binding contract to use the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Acceptable use</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          You agree not to use the platform to generate or publish unlawful, defamatory, deceptive,
          infringing, or harmful content; to attempt to circumvent quota, rate-limit, or security
          controls; to resell or sublicense access without authorization; or to use the service in a way
          that violates Google&apos;s Gemini API usage policies. We may suspend or terminate access for
          abuse, security risk, non-payment, or repeated policy violations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Content ownership</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          As between you and us, you own the articles, outlines, and other content generated through your
          account, subject to the underlying AI provider&apos;s terms and any third-party rights in
          material you supplied as input (e.g., a competitor URL or writing sample). We do not claim
          ownership over your generated output. You are solely responsible for verifying that content you
          publish does not infringe third-party rights, is factually accurate, and complies with
          applicable law before it goes live.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Plans, quotas, and billing</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          The Starter plan includes a limited number of platform-billed article generations per calendar
          month; Growth and Scale plans include higher or unlimited monthly quotas. If you provide your
          own Gemini API key (Bring Your Own Key, or &quot;BYOK&quot;), generations made with that key are
          not counted against your plan&apos;s quota, and any usage fees are billed to you directly by
          Google. Quotas reset at the start of each calendar month. We may introduce paid billing (e.g.,
          via Stripe) for paid tiers in the future; you will be notified of any material pricing changes
          before they take effect.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. API usage and rate limits</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          To protect service stability and prevent abuse, generation endpoints are subject to per-user
          rate limits, and authentication endpoints are subject to per-IP rate limits. Requests that
          exceed these limits will receive an HTTP 429 response with a suggested retry delay.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Disclaimers</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          The service and all AI-generated content are provided &quot;as is&quot; and &quot;as
          available,&quot; without warranties of any kind, whether express or implied, including
          warranties of merchantability, fitness for a particular purpose, accuracy, or non-infringement.
          AI-generated content may contain errors, omissions, or inaccuracies and should be reviewed by a
          human before publication or reliance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Limitation of liability</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          To the maximum extent permitted by law, goals.ac and its affiliates will not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of profits,
          revenue, data, or goodwill, arising from your use of the service. Our total aggregate liability
          for any claim arising out of or relating to these terms or the service will not exceed the
          greater of (a) the amount you paid us in the twelve months preceding the claim, or (b) $100.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">9. Changes to these terms</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          We may update these terms from time to time. Material changes will be reflected by an updated
          &quot;Last updated&quot; date on this page, and, where appropriate, additional notice. Continued
          use of the service after changes take effect constitutes acceptance of the revised terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">10. Contact</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Questions about these terms can be sent to{" "}
          <a className="text-(--accent-warm) hover:underline" href="mailto:legal@goals.ac">
            legal@goals.ac
          </a>
          .
        </p>
      </section>
    </LegalPageClient>
  );
}
