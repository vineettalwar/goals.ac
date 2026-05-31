export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-24 space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">About goals.ac</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          goals.ac is an AI-powered growth platform built for B2B startups who want to compete with much larger marketing teams — without hiring one.
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Our mission</h2>
        <p className="text-muted-foreground leading-relaxed">
          We believe every startup deserves a clear growth strategy and the content to execute it. Expensive agencies and generic AI tools shouldn&apos;t be the only options.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          goals.ac uses the latest Gemini AI models to generate highly specific, audience-targeted content — from 12-month growth roadmaps to weekly SEO articles published automatically to your WordPress site.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { stat: "10k+", label: "Roadmaps generated" },
          { stat: "50k+", label: "Articles published" },
          { stat: "500+", label: "Companies growing" },
        ].map(({ stat, label }) => (
          <div key={label} className="paper-card rounded-xl p-6 text-center">
            <p className="text-4xl font-bold text-primary">{stat}</p>
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
