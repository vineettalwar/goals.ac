/** Unsplash hero backgrounds — one distinct image per page/section. */
const unsplash = (path: string, w = 1600) =>
  `https://images.unsplash.com/${path}?auto=format&fit=crop&w=${w}&q=85`;

export const HERO_IMAGES = {
  home: {
    /** Hero base — misty mountain peaks */
    base: unsplash("photo-1510134659073-54f147c0afc2"),
    /** Spotlight reveal — deep forest */
    spotlight: unsplash("photo-1448375240586-882707db888b"),
    /** Workflow section — late-night planning desk */
    workflow: unsplash("photo-1703969083653-da62f9ea70af"),
    /** Bottom CTA — ocean at night */
    cta: unsplash("photo-1580659986392-440ea995857c"),
  },
  features: unsplash("photo-1719400471588-575b23e27bd7"),
  pricing: unsplash("photo-1551288049-bebda4e38f71"),
  geoAudit: unsplash("photo-1486184885347-1464b5f10296"),
  about: unsplash("photo-1502252430442-aac78f397426"),
  roadmaps: unsplash("photo-1485470733090-0aae1788d5af"),
  contentEngine: unsplash("photo-1631755218195-8d8e7b2c04d6"),
  roadmapDetail: unsplash("photo-1506452305024-9d3f02d1c9b5"),
  geoAuditResult: unsplash("photo-1566410824233-a8011929225c"),
  seoArticle: unsplash("photo-1512018611669-583e87835849"),
  contentStrategy: unsplash("photo-1616266126575-1471ec059439"),
  legal: unsplash("photo-1478760329108-5c3ed9d495a0"),
} as const;
