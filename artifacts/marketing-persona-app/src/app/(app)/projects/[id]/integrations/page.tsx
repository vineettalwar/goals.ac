import { redirect } from "next/navigation";
import { projectIntegrationsPath } from "@workspace/app-shell";

const PROJECT_TABS = new Set(["cms", "social", "esp", "search"]);
const SOCIAL_STATUS_KEYS = ["linkedin", "twitter", "meta", "bluesky", "mastodon"] as const;
const SEARCH_STATUS_KEYS = ["gsc", "bing", "ga4"] as const;
const PRESERVE_KEYS = [...SOCIAL_STATUS_KEYS, ...SEARCH_STATUS_KEYS, "token"] as const;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProjectIntegrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const hasSocial = SOCIAL_STATUS_KEYS.some((key) => firstParam(sp[key]));
  const hasSearch = SEARCH_STATUS_KEYS.some((key) => firstParam(sp[key]));
  const tabParam = firstParam(sp.tab);
  const tabFromQuery =
    tabParam && PROJECT_TABS.has(tabParam)
      ? (tabParam as "cms" | "social" | "esp" | "search")
      : null;

  const tab = hasSocial ? "social" : hasSearch ? "search" : tabFromQuery ?? "cms";

  const qs = new URLSearchParams();
  for (const key of PRESERVE_KEYS) {
    const value = firstParam(sp[key]);
    if (value) qs.set(key, value);
  }

  const path = projectIntegrationsPath(id, tab);
  const query = qs.toString();
  redirect(query ? `${path}?${query}` : path);
}
