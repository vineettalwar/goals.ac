const IMG = (id: string) =>
  `https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2F${id}&w=1280&q=85`;

export const HERO_IMAGES = {
  home: {
    base: IMG("hf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png"),
    spotlight: IMG("hf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png"),
  },
  features: IMG("hf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png"),
  pricing: IMG("hf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png"),
  geoAudit: IMG("hf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png"),
  about: IMG("hf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png"),
  roadmaps: IMG("hf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png"),
  contentEngine: IMG("hf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png"),
  roadmapDetail: IMG("hf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png"),
  geoAuditResult: IMG("hf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png"),
  seoArticle: IMG("hf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png"),
  contentStrategy: IMG("hf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png"),
  legal: IMG("hf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png"),
} as const;
