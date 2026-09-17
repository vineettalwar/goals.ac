export type ChatProductSurface = "blog_wordpress" | "full";

export type ChatCapabilityGroup = {
  label: string;
  prompts: string[];
};

const FULL_ONLY_LABELS = new Set(["GEO", "Social", "Research"]);

export function chatCapabilityPrompts(
  surface: ChatProductSurface = "full",
  keyword?: string,
  url?: string,
): ChatCapabilityGroup[] {
  const brief = keyword ? `Brief for ${keyword}` : "Write a brief";
  const dailyFive = keyword ? `Start Daily Five for ${keyword}` : "Start Daily Five";
  const ctrTitles = keyword ? `Suggest CTR titles for ${keyword}` : "Suggest CTR titles";
  const relaunch = url ? `Relaunch risk for ${url}` : "Check relaunch risk";
  const geoAudit = url ? `Run GEO audit for ${url}` : "Run GEO audit";

  const groups: ChatCapabilityGroup[] = [
    {
      label: "Create",
      prompts: [
        "Onboard a site",
        brief,
        "Push to WordPress",
        dailyFive,
        "Rescan the brand site",
      ],
    },
    {
      label: "Plan",
      prompts: ["Show the roadmap", "Show the calendar", "Generate a topical map"],
    },
    {
      label: "Search",
      prompts: [
        "What's slipping?",
        "CTR gaps",
        ctrTitles,
        "Check backlinks",
        "Show performance",
        "Show AI visibility",
        relaunch,
      ],
    },
    {
      label: "GEO",
      prompts: ["Show last GEO audit", geoAudit],
    },
    {
      label: "Social",
      prompts: ["Social queue status", "Draft a LinkedIn post"],
    },
    {
      label: "Research",
      prompts: ["Show competitors"],
    },
    {
      label: "Ops",
      prompts: ["Autopilot status", "Integrations health", "Add to Action Queue"],
    },
  ];
  if (surface === "blog_wordpress") {
    return groups.filter((group) => !FULL_ONLY_LABELS.has(group.label));
  }
  return groups;
}

export function chatCapabilityPromptList(
  surface: ChatProductSurface = "full",
  keyword?: string,
  url?: string,
): string[] {
  return chatCapabilityPrompts(surface, keyword, url).flatMap((group) => group.prompts);
}

export const TOOL_NAV: Record<string, { title: string; href: string; reason: string }> = {
  strategy_overview: { title: "Roadmaps", href: "/strategy/roadmaps", reason: "Open strategy" },
  generate_roadmap: { title: "Roadmaps", href: "/strategy/roadmaps", reason: "Open the new plan" },
  calendar_overview: { title: "Calendar", href: "/strategy/calendar", reason: "Open the calendar" },
  generate_topical_map: { title: "Topical map", href: "/strategy/topical-map", reason: "Open topical map" },
  performance_overview: { title: "Performance", href: "/search/performance", reason: "Open performance" },
  visibility_overview: { title: "AI visibility", href: "/search/visibility", reason: "Open visibility" },
  run_visibility_check: { title: "AI visibility", href: "/search/visibility", reason: "Open visibility" },
  geo_last_audit: { title: "GEO Audit", href: "/audit", reason: "Open GEO audit" },
  run_geo_audit: { title: "GEO Audit", href: "/audit", reason: "Open GEO audit" },
  get_backlinks_overview: { title: "Keywords", href: "/search/keywords", reason: "Open Search" },
  suggest_ctr_title: { title: "Studio", href: "__studio__", reason: "Edit titles in Studio" },
  suggest_internal_links: { title: "Studio", href: "__studio__", reason: "Edit links in Studio" },
  social_queue_status: { title: "Social Hub", href: "__social__", reason: "Open Social Hub" },
  draft_social: { title: "Social Hub", href: "__social__", reason: "Open the social draft" },
  autopilot_status: { title: "Autopilot", href: "__autopilot__", reason: "Open Autopilot" },
  integrations_health: { title: "Integrations", href: "__integrations__", reason: "Open integrations" },
  start_daily_five: { title: "Daily Five", href: "__daily_five__", reason: "Open Daily Five" },
  brand_rescan: { title: "Brand", href: "__brand__", reason: "Open the project" },
  upsert_action_queue: { title: "Actions", href: "/search/actions", reason: "Open the Action Queue" },
};

export function resolveToolNavHref(
  tool: string,
  projectId: number,
  studioHref: string,
): { title: string; href: string; reason: string } | null {
  const row = TOOL_NAV[tool];
  if (!row) return null;
  const href =
    row.href === "__studio__"
      ? studioHref
      : row.href === "__social__"
        ? `/projects/${projectId}/social`
        : row.href === "__autopilot__"
          ? `/projects/${projectId}?tab=automation`
          : row.href === "__integrations__"
            ? `/projects/${projectId}`
            : row.href === "__daily_five__"
              ? `/projects/${projectId}/daily-five`
              : row.href === "__brand__"
                ? `/projects/${projectId}`
                : row.href;
  return { ...row, href };
}
