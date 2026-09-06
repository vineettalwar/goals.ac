import { fetchPublicText } from "../safe-fetch";
import { originOf } from "./origin";

export type RobotsAgentRules = {
  userAgents: string[];
  allows: string[];
  disallows: string[];
  blocksAll: boolean;
};

export type RobotsTxtResult = {
  url: string;
  content: string;
  /** True when the `*` group (or only group) does not Disallow `/`. */
  allowsAll: boolean;
  /** Flattened Disallow paths from the `*` group (fallback: all groups). */
  disallows: string[];
  sitemapUrls: string[];
  agents: RobotsAgentRules[];
  /** User-agents whose rules block the whole site (`/` or `/*`). */
  flaggedAgents: string[];
};

function blocksWholeSite(disallows: string[]): boolean {
  return disallows.some((d) => d === "/" || d === "/*");
}

/** Pure robots.txt parser — exported for tests. */
export function parseRobotsTxt(content: string, robotsUrl: string): RobotsTxtResult {
  const sitemapUrls: string[] = [];
  const agents: RobotsAgentRules[] = [];
  let current: { userAgents: string[]; allows: string[]; disallows: string[] } | null = null;
  let collectingAgents = true;

  const flush = () => {
    if (!current || current.userAgents.length === 0) return;
    const disallows = current.disallows;
    agents.push({
      userAgents: [...current.userAgents],
      allows: [...current.allows],
      disallows: [...disallows],
      blocksAll: blocksWholeSite(disallows),
    });
    current = null;
  };

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === "user-agent") {
      if (!collectingAgents || !current) {
        flush();
        current = { userAgents: [], allows: [], disallows: [] };
      }
      collectingAgents = true;
      if (value) current.userAgents.push(value);
      continue;
    }

    if (key === "sitemap") {
      if (value) sitemapUrls.push(value);
      continue;
    }

    if (key === "disallow" || key === "allow") {
      if (!current) {
        current = { userAgents: ["*"], allows: [], disallows: [] };
      }
      collectingAgents = false;
      if (key === "disallow") current.disallows.push(value);
      else current.allows.push(value);
    }
  }
  flush();

  const star = agents.find((a) => a.userAgents.some((ua) => ua === "*"));
  const primary = star ?? agents[0];
  const disallows = primary?.disallows ?? [];
  const flaggedAgents = agents.flatMap((a) => (a.blocksAll ? a.userAgents : []));

  return {
    url: robotsUrl,
    content,
    allowsAll: !(primary?.blocksAll ?? false),
    disallows,
    sitemapUrls: [...new Set(sitemapUrls)],
    agents,
    flaggedAgents,
  };
}

export async function checkRobotsTxt(siteUrl: string): Promise<RobotsTxtResult> {
  const origin = originOf(siteUrl);
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const content = await fetchPublicText(robotsUrl, {
      accept: "text/plain,*/*;q=0.8",
    });
    return parseRobotsTxt(content, robotsUrl);
  } catch {
    return {
      url: robotsUrl,
      content: "",
      allowsAll: true,
      disallows: [],
      sitemapUrls: [],
      agents: [],
      flaggedAgents: [],
    };
  }
}
