import { splitTwitterThread } from "@workspace/connectors/twitter-thread";
import { countAiSlopSignals } from "../content/ai-writing-rules";

export type SocialThreadQualityBreakdown = {
  label: string;
  score: number;
  max: number;
  detail: string;
};

export type SocialThreadQualityResult = {
  total: number;
  breakdown: SocialThreadQualityBreakdown[];
  tweetCount: number;
  overLimitCount: number;
};

const TWEET_LIMIT = 280;

function scoreHook(first: string | undefined): SocialThreadQualityBreakdown {
  const max = 20;
  if (!first?.trim()) {
    return { label: "Hook", score: 0, max, detail: "Missing opening tweet" };
  }
  const len = first.length;
  let score = 0;
  if (len >= 40 && len <= 240) score += 10;
  else if (len >= 20) score += 5;
  if (/thread|🧵/i.test(first)) score += 5;
  if (/\d+%|\d{1,3}(?:,\d{3})+|\$\d/.test(first)) score += 3;
  if (/[?]/.test(first) || /^(stop|most|never|why|how)\b/i.test(first.trim())) score += 2;
  return {
    label: "Hook",
    score: Math.min(max, score),
    max,
    detail: score >= 15 ? "Strong opener" : "Lead with a bold claim or stat; end tweet 1 with Thread 🧵",
  };
}

function scoreLengthDiscipline(tweets: string[]): SocialThreadQualityBreakdown {
  const max = 25;
  if (tweets.length === 0) {
    return { label: "Length", score: 0, max, detail: "No tweets to score" };
  }
  const over = tweets.filter((t) => t.length > TWEET_LIMIT).length;
  const tooShort = tweets.filter((t) => t.length < 40).length;
  const sweet = tweets.filter((t) => t.length >= 80 && t.length <= 240).length;
  let score = max;
  score -= over * 8;
  score -= Math.min(10, tooShort * 2);
  score = Math.min(max, Math.max(0, score + Math.floor((sweet / tweets.length) * 5)));
  return {
    label: "Length",
    score,
    max,
    detail:
      over > 0
        ? `${over} tweet${over === 1 ? "" : "s"} over ${TWEET_LIMIT} chars`
        : `${tweets.length} tweets · keep each under ${TWEET_LIMIT}`,
  };
}

function scoreStructure(tweets: string[], rawBody: string): SocialThreadQualityBreakdown {
  const max = 20;
  const numbered = (rawBody.match(/^\d+\//gm) ?? []).length;
  let score = 0;
  if (tweets.length >= 5 && tweets.length <= 12) score += 12;
  else if (tweets.length >= 3) score += 7;
  else if (tweets.length >= 2) score += 4;
  if (numbered >= tweets.length && numbered >= 2) score += 8;
  else if (numbered >= 2) score += 4;
  return {
    label: "Structure",
    score: Math.min(max, score),
    max,
    detail:
      numbered >= 2
        ? `${tweets.length} tweets numbered 1/…${tweets.length}/`
        : "Format as 1/ … 2/ … so publish splits correctly",
  };
}

function scoreClose(last: string | undefined): SocialThreadQualityBreakdown {
  const max = 15;
  if (!last?.trim()) {
    return { label: "Close", score: 0, max, detail: "Missing closing tweet" };
  }
  let score = 5;
  if (/bookmark|retweet|follow|save|share|reply|comment/i.test(last)) score += 7;
  if (/framework|checklist|steps?|try this/i.test(last)) score += 3;
  return {
    label: "Close",
    score: Math.min(max, score),
    max,
    detail: score >= 12 ? "Clear CTA" : "End with a bookmark/retweet ask or next step",
  };
}

function scoreVoice(body: string): SocialThreadQualityBreakdown {
  const max = 20;
  const slop = countAiSlopSignals(body);
  const score = Math.max(0, max - Math.min(max, slop * 3));
  return {
    label: "Human voice",
    score,
    max,
    detail: slop === 0 ? "Reads human" : `${slop} AI-tell signal${slop === 1 ? "" : "s"} — tighten phrasing`,
  };
}

/** Quality for X/Twitter threads — per-tweet heuristics, not article SEO. */
export function scoreTwitterThreadQuality(bodyMarkdown: string): SocialThreadQualityResult {
  const rawTweets = splitTwitterThread(bodyMarkdown, Number.MAX_SAFE_INTEGER);
  const tweets = rawTweets.length > 0 ? rawTweets : bodyMarkdown.trim() ? [bodyMarkdown.trim()] : [];
  const overLimitCount = tweets.filter((t) => t.length > TWEET_LIMIT).length;

  const breakdown = [
    scoreHook(tweets[0]),
    scoreLengthDiscipline(tweets),
    scoreStructure(tweets, bodyMarkdown),
    scoreClose(tweets[tweets.length - 1]),
    scoreVoice(bodyMarkdown),
  ];

  const totalMax = breakdown.reduce((sum, row) => sum + row.max, 0);
  const totalScore = breakdown.reduce((sum, row) => sum + row.score, 0);
  const total = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  return {
    total,
    breakdown,
    tweetCount: tweets.length,
    overLimitCount,
  };
}
