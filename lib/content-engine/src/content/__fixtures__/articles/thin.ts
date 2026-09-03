import type { ArticleFixture } from "./types";

/**
 * Under 400 words, one H2, no FAQ, no citations. Deliberately thin so the thin-content
 * warning, the low external-citation warning, and a low scoreArticleQuality total all fire.
 */
export const thin: ArticleFixture = {
  name: "thin",
  title: "Quick Tips for Watering Houseplants",
  metaDescription: "A few quick tips for watering houseplants so they don't dry out or drown.",
  targetKeyword: "watering houseplants",
  expectation:
    "Under 400 words, one H2, no FAQ, no citations. Should produce thin_content and few_citations warnings and score low on scoreArticleQuality.",
  bodyMarkdown: `Most houseplants die from too much water, not too little. Check the soil with a finger before you water. If the top inch feels dry, water it. If it still feels damp, wait a couple more days.

## A few habits that help

Water in the morning so any excess has time to evaporate before night. Use a pot with a drainage hole, since standing water at the bottom rots roots fast. Skip the fixed weekly schedule and check the soil instead, since a plant's water needs change with the season and the room's light.

Bigger leaves and warmer rooms mean a plant drinks faster. Small plants in low light drink slower and can sit for a week or more between waterings. If leaves start turning yellow and soft, cut back. If they turn brown and crispy at the edges, water a little more often.
`,
};
