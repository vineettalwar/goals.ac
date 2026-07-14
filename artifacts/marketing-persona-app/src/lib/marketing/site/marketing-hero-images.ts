/** One cinematic hero photo per page — avoid stacking multiple bg images on a single route. */
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
  },
  features: {
    hero: unsplash("photo-1778443067798-f571cafd566d"),
  },
  pricing: {
    hero: unsplash("photo-1529522239208-83232b5c49b6"),
  },
  geoAudit: {
    hero: unsplash("photo-1702259970719-fc3b6448de9b"),
  },
  geoAuditResult: {
    hero: unsplash("photo-1659990589738-c653e1c96239"),
  },
  about: {
    hero: unsplash("photo-1760709971923-8205c21c2bfb"),
  },
  roadmaps: {
    hero: unsplash("photo-1781665568112-b4443eb31ff8"),
  },
  roadmapDetail: {
    hero: unsplash("photo-1767528890641-bd8e63e69045"),
  },
  contentEngine: {
    hero: unsplash("photo-1701894581684-829184a18749"),
  },
  contentStrategy: {
    hero: unsplash("photo-1494376877685-d3d2559d4f82"),
  },
  seoArticle: {
    hero: unsplash("photo-1496156298940-6902fc34e55d"),
  },
  legal: {
    hero: unsplash("photo-1628242345770-ec44a4f72017"),
  },
} as const;
