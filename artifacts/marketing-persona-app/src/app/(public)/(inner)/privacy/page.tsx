import type { Metadata } from "next";
import { LegalPageClient } from "@/components/marketing/pages/company/legal-page-client";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How goals.ac collects, uses, and protects account, content, CMS, analytics, and AI processing data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPageClient titleLine1="Privacy" titleLine2="policy" lastUpdated="September 16, 2026">
      <p className="text-sm text-white/65 leading-relaxed">
        Controller: Some Tech Work UG (haftungsbeschränkt), Wiesbaden, Germany. Contact{" "}
        <a className="text-(--accent-warm) hover:underline" href="mailto:privacy@goals.ac">
          privacy@goals.ac
        </a>
        . This policy describes the product as shipped (Cloudflare Workers, D1, Stripe billing, multi-provider AI). It is not a substitute for a signed DPA. Draft DPA: ask counsel; internal template lives in the repo for legal review.
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Information we collect</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Account details (name, email, password hash or Google account id, optional avatar URL, TOTP secret if you enable MFA). Organization and project data (sites, brand profiles, goals, briefs, drafts, publish records). CMS and analytics credentials you connect (WordPress, Ghost, webhooks, Google Search Console, GA4), stored encrypted. SEO chat messages and agent run traces for the in-product chat. Usage metrics (token counts, model, estimated cost) without full prompt dumps in the usage ledger. Technical data (IP, user agent, timestamps) for security and rate limits.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. How we use it</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          To generate, review, and publish content you request; to authenticate sessions; to enforce plan quotas and credits; to show usage; to operate autopilot jobs; and to secure the service. We do not sell personal data. We do not use your content to train third-party foundation models beyond what the provider requires to fulfil that API call.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. AI processing</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Generation can be routed to Google Gemini, AWS Bedrock, OpenAI, Anthropic, OpenRouter, Groq, NVIDIA, or Ollama, depending on org settings and BYOK keys. Relevant brand, keyword, and sample text is sent to the selected provider to produce a response. Platform-key traffic is billed to us and counted against your plan. BYOK traffic uses your key and is governed by your contract with that provider. A current list is on{" "}
          <a className="text-(--accent-warm) hover:underline" href="/subprocessors">
            /subprocessors
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Credentials</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Third-party secrets (AI keys, CMS passwords, OAuth tokens) are encrypted at rest with AES-256-GCM. They are decrypted in memory only to serve a request. Rotating the platform encryption secret makes existing ciphertext unreadable; that is an ops procedure, not an in-product toggle.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Cookies and sessions</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          We use essential cookies only: an HttpOnly session cookie (Auth.js / Edge Mesh JWT) and a client-side active-project cookie to remember which site you last opened. No advertising or third-party analytics cookies. Details:{" "}
          <a className="text-(--accent-warm) hover:underline" href="/cookies">
            /cookies
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">6. Hosting and location</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Production API and database run on Cloudflare Workers and D1. The repo does not pin a D1 location hint. Treat storage as Cloudflare&apos;s global network unless we confirm an EU pin in writing. Local development may use PostgreSQL on your machine.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">7. Retention and deletion</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          We keep account and content data while the account is active. You can export a JSON package of your user, projects, and org memberships from the product (GET /api/auth/me/export) or by emailing privacy@goals.ac. You can delete your account in settings if you are the only member of your organization; if others remain, remove them first. Deletion removes your user, owned projects and their content, encrypted credentials, companies, and sessions. Billing records required by tax law may be retained.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">8. Your rights</h2>
        <p className="text-sm text-white/65 leading-relaxed">
          Depending on applicable law you may access, correct, export, or delete personal data, and object to or restrict processing. Email privacy@goals.ac. A processor agreement (DPA/AVV) is available for counsel review on request; it is not in-app clickwrap.
        </p>
      </section>
    </LegalPageClient>
  );
}
