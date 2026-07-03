export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: July 3, 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Information we collect</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We collect account details (name, email), onboarding data (company profile, audience details), and content inputs you submit.
          If you connect WordPress or provide your own API key, credentials are encrypted before storage.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. How we use your information</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We use your data to generate, personalize, and publish content, maintain account security, and improve product quality.
          We do not sell your data to third parties.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Data security</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sensitive credentials are encrypted at rest using AES-256-GCM. Access to account data is scoped by authenticated user sessions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Third-party services</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We rely on third-party providers for AI generation and publishing integrations. Your usage of those integrations may also be subject to their terms and privacy policies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For privacy-related requests, contact <a className="text-primary hover:underline" href="mailto:privacy@goals.ac">privacy@goals.ac</a>.
        </p>
      </section>
    </div>
  );
}
