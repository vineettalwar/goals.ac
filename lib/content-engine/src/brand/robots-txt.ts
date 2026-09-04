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

/**
 * Merges every group matching at the chosen specificity level. RFC 9309
 * requires all records for a matching product token to be combined, not
 * just the first one encountered.
 */
function mergeGroups(groups: Group[]): Group {
  const merged: Group = { agents: [], disallow: [], allow: [] };
  for (const group of groups) {
    merged.agents.push(...group.agents);
    merged.disallow.push(...group.disallow);
    merged.allow.push(...group.allow);
    if (group.crawlDelaySeconds !== undefined) merged.crawlDelaySeconds = group.crawlDelaySeconds;
  }
  return merged;
}

/**
 * Picks the most specific matching groups and merges them: a case-insensitive
 * prefix match of the product token beats `*`. Per RFC 9309 the match is a
 * prefix test against the token, not a two-way substring test — a group for
 * "a" must not capture a request from "goalsac".
 */
function selectGroup(groups: Group[], userAgent: string): Group | null {
  const token = agentToken(userAgent);
  const wildcardGroups: Group[] = [];
  const specificGroups: Group[] = [];

  for (const group of groups) {
    for (const agent of group.agents) {
      if (agent === "*") {
        wildcardGroups.push(group);
      } else if (agent.length > 0 && token.startsWith(agent)) {
        specificGroups.push(group);
      }
    }
  }

  if (specificGroups.length > 0) return mergeGroups(specificGroups);
  if (wildcardGroups.length > 0) return mergeGroups(wildcardGroups);
  return null;
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
      pending = fetchText(`${origin}/robots.txt`).then((text) =>
        text ? parseRobotsTxt(text, userAgent) : { disallow: [], allow: [] },
      );
      // A missing/500/unparseable robots.txt is a definitive answer (allow
      // all) and stays cached above. A thrown fetch is not an answer — a
      // DNS blip or timeout must not permanently disable robots for the
      // rest of the run, so drop the cache entry and let the next URL retry.
      pending.catch(() => {
        rulesByOrigin.delete(origin);
      });
      rulesByOrigin.set(origin, pending);
    }
    return pending.catch(() => ({ disallow: [], allow: [] }) as RobotsRules);
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
