/**
 * Minimal robots.txt parser/gate for the brand crawler.
 *
 * Implements the parts of the standard we need: User-agent groups, the
 * most specific matching agent wins over `*`, longest-match-wins between
 * a matching Allow and Disallow, `*`/`$` wildcards in paths, and an empty
 * `Disallow:` meaning allow-all for that group.
 */

export type RobotsRules = {
  disallow: string[];
  allow: string[];
  crawlDelaySeconds?: number;
};

type Group = {
  agents: string[];
  disallow: string[];
  allow: string[];
  crawlDelaySeconds?: number;
};

function parseGroups(text: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let sawRuleSinceLastAgent = true;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const field = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    if (field === "user-agent") {
      // A new User-agent line right after a rule line starts a new group;
      // consecutive User-agent lines (no rules between them) extend the
      // current group so it matches multiple agents.
      if (!current || sawRuleSinceLastAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
        sawRuleSinceLastAgent = false;
      }
      current!.agents.push(value.toLowerCase());
      continue;
    }

    if (!current) continue;

    if (field === "disallow") {
      current.disallow.push(value);
      sawRuleSinceLastAgent = true;
    } else if (field === "allow") {
      current.allow.push(value);
      sawRuleSinceLastAgent = true;
    } else if (field === "crawl-delay") {
      const seconds = Number(value);
      if (Number.isFinite(seconds)) current.crawlDelaySeconds = seconds;
      sawRuleSinceLastAgent = true;
    }
  }

  return groups;
}

function agentToken(userAgent: string): string {
  return userAgent.trim().toLowerCase();
}

/** Picks the most specific matching group: an exact/prefix agent match beats `*`. */
function selectGroup(groups: Group[], userAgent: string): Group | null {
  const token = agentToken(userAgent);
  let wildcard: Group | null = null;
  let specific: Group | null = null;

  for (const group of groups) {
    for (const agent of group.agents) {
      if (agent === "*") {
        wildcard = wildcard ?? group;
      } else if (token.includes(agent) || agent.includes(token)) {
        specific = specific ?? group;
      }
    }
  }

  return specific ?? wildcard;
}

export function parseRobotsTxt(text: string, userAgent: string): RobotsRules {
  const groups = parseGroups(text);
  const group = selectGroup(groups, userAgent);
  if (!group) return { disallow: [], allow: [] };

  return {
    disallow: group.disallow.filter((p) => p.length > 0),
    allow: group.allow,
    crawlDelaySeconds: group.crawlDelaySeconds,
  };
}

/** Converts a robots.txt path pattern (with `*` and trailing `$`) to a RegExp. */
function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body
    .split("*")
    .map((chunk) => chunk.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}${anchored ? "$" : ""}`);
}

function matchLength(pattern: string, path: string): number {
  if (!patternToRegExp(pattern).test(path)) return -1;
  // Longest-match-wins uses the literal pattern length (minus wildcard
  // syntax), which is the standard's own tie-breaking rule.
  return pattern.replace(/\$$/, "").length;
}

export function isPathAllowed(rules: RobotsRules, url: string): boolean {
  let path: string;
  try {
    const u = new URL(url);
    path = u.pathname + u.search;
  } catch {
    return true;
  }

  let bestDisallow = -1;
  for (const pattern of rules.disallow) {
    if (!pattern) continue;
    const len = matchLength(pattern, path);
    if (len > bestDisallow) bestDisallow = len;
  }

  if (bestDisallow === -1) return true;

  let bestAllow = -1;
  for (const pattern of rules.allow) {
    if (!pattern) continue;
    const len = matchLength(pattern, path);
    if (len > bestAllow) bestAllow = len;
  }

  return bestAllow >= bestDisallow;
}

export function createRobotsGate(
  userAgent: string,
  fetchText: (url: string) => Promise<string | null>,
): { isAllowed(url: string): Promise<boolean> } {
  const rulesByOrigin = new Map<string, Promise<RobotsRules>>();

  function rulesForOrigin(origin: string): Promise<RobotsRules> {
    let pending = rulesByOrigin.get(origin);
    if (!pending) {
      pending = fetchText(`${origin}/robots.txt`)
        .then((text) => (text ? parseRobotsTxt(text, userAgent) : { disallow: [], allow: [] }))
        .catch(() => ({ disallow: [], allow: [] }) as RobotsRules);
      rulesByOrigin.set(origin, pending);
    }
    return pending;
  }

  return {
    async isAllowed(url: string): Promise<boolean> {
      let origin: string;
      try {
        origin = new URL(url).origin;
      } catch {
        return true;
      }
      const rules = await rulesForOrigin(origin);
      return isPathAllowed(rules, url);
    },
  };
}
