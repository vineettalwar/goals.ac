import { scoreMetaTags } from "@workspace/seo-tools/freeTools";
import { auditUrl } from "@workspace/seo-tools/geoAuditor";
import { runPublicFreeTool } from "@/lib/marketing/tools/public-free-tool";

export async function POST(req: Request) {
  return runPublicFreeTool(req, async (url) => {
    const audit = await auditUrl(url);
    const meta = scoreMetaTags(audit.pageTitle, audit.metaDescription, {
      h1: audit.h1Text,
      ogTitle: audit.ogTitle,
      ogDescription: audit.ogDescription,
    });
    return {
      url,
      ...meta,
      pageTitle: audit.pageTitle,
      metaDescription: audit.metaDescription,
      h1: audit.h1Text,
      ogTitle: audit.ogTitle,
      ogDescription: audit.ogDescription,
    };
  });
}
