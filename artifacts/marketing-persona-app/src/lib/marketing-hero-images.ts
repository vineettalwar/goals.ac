/** Marketing backgrounds — one unique cinematic photo per slot, hero-aligned palette. */
const unsplash = (path: string, w = 1600) =>
  `https://images.unsplash.com/${path}?auto=format&fit=crop&w=${w}&q=85`;

const higgs = (url: string, w = 1280) =>
  `https://images.higgs.ai/?default=1&output=webp&url=${encodeURIComponent(url)}&w=${w}&q=85`;

const HIGGS_BASE =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png";
const HIGGS_SPOTLIGHT =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png";

export const HERO_IMAGES = {
  home: {
    base: higgs(HIGGS_BASE),
    spotlight: higgs(HIGGS_SPOTLIGHT),
    workflow: unsplash("photo-1486184885347-1464b5f10296"), // misty slope
    signup: unsplash("photo-1496619465405-721b2b66a868"), // rocky night landscape
    footer: unsplash("photo-1580659986392-440ea995857c"), // ocean at night
  },
  features: {
    hero: unsplash("photo-1778443067798-f571cafd566d"), // foggy Nordic cliffs
    capabilities: unsplash("photo-1517239320384-e08ad2c24a3e"), // Waipu caves
    cta: unsplash("photo-1620127055583-9e5d1c79c59c"), // dark ridgeline
    footer: unsplash("photo-1600183227108-745876b0c9bb"), // moody terrain
  },
  pricing: {
    hero: unsplash("photo-1529522239208-83232b5c49b6"), // dark peaks
    footer: unsplash("photo-1496150458551-140441714f2f"), // volcanic dusk
  },
  geoAudit: {
    hero: unsplash("photo-1702259970719-fc3b6448de9b"), // dramatic rock face
    checks: unsplash("photo-1659990589628-d1f999129056"), // layered stone
  },
  geoAuditResult: {
    hero: unsplash("photo-1659990589738-c653e1c96239"), // wide dark canyon
    cta: unsplash("photo-1544044479-4ff512bd5ebe"), // volcanic texture
  },
  about: {
    hero: unsplash("photo-1760709971923-8205c21c2bfb"), // volcanic landscape
    mission: unsplash("photo-1701894676233-bf211725a65a"), // basalt columns
    footer: unsplash("photo-1767099579568-bc4b88fc8ea4"), // rock formation close-up
  },
  roadmaps: {
    hero: unsplash("photo-1781665568112-b4443eb31ff8"), // Etna fog
  },
  roadmapDetail: {
    hero: unsplash("photo-1767528890641-bd8e63e69045"), // lava coast dawn
  },
  contentEngine: {
    hero: unsplash("photo-1701894581684-829184a18749"), // dark volcanic panorama
    formats: unsplash("photo-1781788127342-63be66003c33"), // sulfur rock
    geo: unsplash("photo-1770192234700-762ddefa59a9"), // craggy silhouette
    footer: unsplash("photo-1630695230041-8909e3204778"), // foggy forest
  },
  contentStrategy: {
    hero: unsplash("photo-1494376877685-d3d2559d4f82"), // deep woods path
    footer: unsplash("photo-1608453908394-f48474d01c23"), // dark forest
  },
  seoArticle: {
    hero: unsplash("photo-1496156298940-6902fc34e55d"), // forest mist
    footer: unsplash("photo-1621409581512-c2bea301a88d"), // moody trees
  },
  legal: {
    hero: unsplash("photo-1628242345770-ec44a4f72017"), // foggy pines
  },
} as const;

/** Dev-only guard: every section photo must be unique (hero base/spotlight excluded). */
function collectPhotoUrls(obj: unknown, out: string[] = []): string[] {
  if (typeof obj === "string") {
    if (obj.includes("unsplash.com") || obj.includes("higgs.ai")) out.push(obj);
    return out;
  }
  if (obj && typeof obj === "object") {
    for (const value of Object.values(obj)) collectPhotoUrls(value, out);
  }
  return out;
}

if (process.env.NODE_ENV === "development") {
  const urls = collectPhotoUrls(HERO_IMAGES);
  const dupes = urls.filter((url, i) => urls.indexOf(url) !== i);
  if (dupes.length > 0) {
    throw new Error(`HERO_IMAGES contains duplicate photos: ${dupes.join(", ")}`);
  }
}
