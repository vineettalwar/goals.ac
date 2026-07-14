import type { Metadata } from "next";
import { LegalPageClient } from "@/components/marketing/pages/company/legal-page-client";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How goals.ac collects, uses, and protects your data, including encrypted API keys and AI processing.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPageClient titleLine1="Privacy" titleLine2="policy" lastUpdated="July 5, 2026">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Information we collect</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          We collect account details (name, email, password hash or Google account identifier),
          onboarding data (company profile, industry, target audience, competitor URLs), and content
          inputs you submit (keywords, angles, writing samples, generated articles and drafts). If you
          connect WordPress, Ghost, a generic webhook, or provide your own Gemini API key, those
          credentials are encrypted before storage. We never store them in plaintext. We also collect
          basic technical data (IP address, user agent, request timestamps) for security, abuse
          prevention, and rate limiting.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. How we use your information</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          We use your data to generate, personalize, and publish content on your behalf; to maintain
          account security and authenticate sessions; to enforce plan quotas and usage limits; to
          measure product usage (tokens consumed, estimated cost, features used) so we can show you an
          accurate usage dashboard; and to improve product quality. We do not sell your personal data to
          third parties, and we do not use your generated content to train third-party models beyond what
          is required to service your generation request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. AI processing disclosure</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Content generation, humanization, and analysis features are powered by Google&apos;s Gemini
          models. When you generate content, relevant inputs (company profile, persona details, target
          keywords, and any writing sample you provide for voice matching) are sent to Google&apos;s
          Gemini API to produce a response. If you choose Bring Your Own Key (BYOK), your requests are
          sent using your own Gemini API key directly to Google. In that case, Google&apos;s own
          privacy and data-handling terms for API usage govern that processing, and API usage is billed
          directly to your Google AI account. If you do not provide a key, requests are processed using
          our platform&apos;s Gemini API key, subject to your plan&apos;s quota.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Encrypted third-party credentials &amp; BYOK key handling</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Any third-party credential you provide (a Gemini API key, WordPress application password,
          Ghost Admin API key, or webhook signing secret) is encrypted at rest using AES-256-GCM before
          it is written to our database. Keys are decrypted only in-memory, only at the moment a
          generation, publish, or test request is made on your behalf, and are never logged or exposed
          in API responses. You can remove a stored key at any time from Settings, which permanently
          deletes the encrypted value.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Cookies &amp; authentication</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          We use a single essential session cookie (managed by NextAuth) to keep you signed in. This
          cookie is required for the product to function and is not used for advertising or
          cross-site tracking. We do not use third-party advertising or analytics cookies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Data retention &amp; deletion</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          We retain account and content data for as long as your account is active. You may request
          deletion of your account and associated data at any time by contacting us; encrypted
          credentials are deleted immediately, and other account data is deleted or anonymized within a
          reasonable period, except where retention is required for legal, security, or billing records.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Data security</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Sensitive credentials are encrypted at rest using AES-256-GCM. Access to account data is
          scoped by authenticated user sessions, and API routes enforce per-user rate limits to reduce
          abuse. Transport is encrypted in transit via HTTPS/TLS.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Third-party services</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          We rely on third-party providers for AI generation (Google Gemini) and publishing integrations
          (WordPress, Ghost, and generic webhook destinations you configure). Your use of those
          integrations may also be subject to their own terms and privacy policies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">9. Your rights</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Depending on your jurisdiction, you may have rights to access, correct, export, or delete your
          personal data. To exercise these rights, contact us using the email below.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">10. Contact</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          For privacy-related requests, contact{" "}
          <a className="text-(--accent-warm) hover:underline" href="mailto:privacy@goals.ac">
            privacy@goals.ac
          </a>
          .
        </p>
      </section>
    </LegalPageClient>
  );
}
