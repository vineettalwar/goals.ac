import { MarketingSection } from "@/components/marketing/sections/marketing-section";
import { MarketingCTA } from "@/components/marketing/sections/marketing-cta";
import {
  PRODUCT_CTA_HREF,
  PRODUCT_CTA_PRIMARY,
} from "@/lib/marketing/site/marketing-contact";

export function FreeToolLlmsGuide() {
  return (
    <>
      <MarketingSection
        variant="dark"
        bridgeTop
        titleLine1="What llms.txt"
        titleLine2="is for"
        description="A plain-text map at your domain root that tells AI systems what your site is about and which pages matter most."
      >
        <ul className="divide-y divide-white/10 border-y border-white/10 max-w-3xl">
          {[
            {
              title: "A site summary AI can quote",
              body: "The H1 and blockquote are the first signals models see — keep them factual, specific, and short.",
            },
            {
              title: "A curated page list",
              body: "Link product, pricing, docs, and flagship articles. Skip login, cart, and every blog archive URL.",
            },
            {
              title: "Optional pointers",
              body: "Sitemap and contact links help crawlers recover when the homepage is thin or heavily client-rendered.",
            },
          ].map((item) => (
            <li key={item.title} className="py-5">
              <h3 className="text-base font-semibold text-white tracking-tight">{item.title}</h3>
              <p className="text-sm text-white/75 mt-1.5 leading-relaxed max-w-prose">{item.body}</p>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection
        bordered
        className="py-16"
        titleLine1="Where to"
        titleLine2="publish it"
        description="Serve llms.txt at the domain root with text/plain. Most CMS hosts and static sites can do this without a plugin."
      >
        <ol className="max-w-3xl space-y-4 text-sm text-white/85">
          <li className="border-t border-white/10 pt-4">
            <span className="font-medium text-white">Static / Next.js</span>
            <p className="mt-1 text-white/75 leading-relaxed">
              Put the file in <code className="text-white/90">public/llms.txt</code> (or a route that returns{" "}
              <code className="text-white/90">text/plain</code>) so it is reachable at{" "}
              <code className="text-white/90">/llms.txt</code>.
            </p>
          </li>
          <li className="border-t border-white/10 pt-4">
            <span className="font-medium text-white">WordPress & connected CMS</span>
            <p className="mt-1 text-white/75 leading-relaxed">
              goals.ac can inject schema and llms.txt through the CMS plugin after you connect a project — use this
              free draft to review the content first.
            </p>
          </li>
          <li className="border-t border-white/10 pt-4 border-b pb-4">
            <span className="font-medium text-white">Verify</span>
            <p className="mt-1 text-white/75 leading-relaxed">
              Open <code className="text-white/90">https://yoursite.com/llms.txt</code> in a browser. You should see
              plain text, not an HTML 404 page. Then re-run this tool to confirm it is detected.
            </p>
          </li>
        </ol>
      </MarketingSection>

      <MarketingCTA
        titleLine1="Audit the rest"
        titleLine2="of your GEO stack"
        description="llms.txt is one signal. Run a free GEO audit for schema, metadata, and heading structure on the same URL."
        variant="dark"
        primaryHref="/geo-audit"
        primaryLabel="Run free GEO audit"
        secondaryHref={PRODUCT_CTA_HREF}
        secondaryLabel={PRODUCT_CTA_PRIMARY}
      />
    </>
  );
}
