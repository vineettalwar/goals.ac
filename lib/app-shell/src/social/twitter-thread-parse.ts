/**
 * Re-export shared splitter so UI and publish stay in lockstep.
 * Leaf module (`twitter-thread`) has no connector client deps.
 */
export {
  splitTwitterThread,
  isTwitterThreadOverLimit,
  maxTwitterThreadTweetLength,
} from "@workspace/connectors/twitter-thread";
