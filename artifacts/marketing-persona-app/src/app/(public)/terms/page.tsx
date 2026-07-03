export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: July 3, 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">1. Service</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          goals.ac provides AI-assisted strategy and content generation tools, including integrations such as WordPress publishing.
          You are responsible for reviewing and approving generated content before publishing.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">2. Accounts</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You are responsible for securing your login credentials and API keys. You must provide accurate account information and comply with applicable laws.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">3. Acceptable use</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You agree not to use the platform for unlawful, deceptive, or harmful content. We may suspend access for abuse, security risk, or repeated policy violations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">4. Billing and API usage</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Paid plans and usage limits may apply. If you choose Bring Your Own API Key (BYOK), third-party AI provider fees are billed directly by that provider.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">5. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Questions about these terms can be sent to <a className="text-primary hover:underline" href="mailto:legal@goals.ac">legal@goals.ac</a>.
        </p>
      </section>
    </div>
  );
}
