import type { ContentFormatType } from "@workspace/db";

export const FORMAT_CONFIGS: Record<
  ContentFormatType,
  { label: string; wordRange: string; structure: string }
> = {
  blog_post: {
    label: "Blog Post",
    wordRange: "1400-1800",
    structure: `- Open on the claim (hook + premise, 2-3 sentences); no labeled intro
- One H2 on stakes or the cost of getting it wrong (~150-200 words); use a topic-specific heading, not stock phrases like "Why X Matters"
- 2-3 H2s on distinct angles (~200-250 words each); vary length and shape
- Practical application: numbered tips when helpful, or tips woven into prose
- Close on the last concrete takeaway (no "Conclusion" / "In conclusion" wrapper)`,
  },
  news_article: {
    label: "News Article",
    wordRange: "600-900",
    structure: `- Inverted pyramid: most important facts first
- Context on what led here (~150 words)
- What changed / key developments (~200 words)
- Sector impact with a specific actor or constraint (~150 words)
- What to watch next (~100 words)
- Journalistic, factual, timely tone; H2 names should fit the story, not a template`,
  },
  tutorial: {
    label: "Tutorial",
    wordRange: "1200-1600",
    structure: `- Intro: outcome readers will achieve plus prerequisites
- Setup/requirements as bullets when needed
- 3-5 sequential action H2s with concrete verb headings (~150-200 words each); avoid generic "Step 1" labels when a named action is clearer
- Pitfalls section when useful (~100-150 words)
- Short recap with next steps (no throat-clearing closer)`,
  },
  guide: {
    label: "Comprehensive Guide",
    wordRange: "1400-1800",
    structure: `- Brief overview of what the guide delivers
- Foundations H2 (~200-250 words) with a topic-specific name
- Friction / failure modes H2 (~200 words); be specific about what breaks
- Recommended approach H2 (~250 words); concrete steps, not filler "framework" language
- Implementation section with numbered steps when useful (~300 words)
- Tools/resources only if they add real value (~150 words)
- Worked example or scenario (~200 words)
- Tight close on the last useful point`,
  },
  whitepaper: {
    label: "Whitepaper",
    wordRange: "1800-2500",
    structure: `- Executive summary (~150 words)
- Cover these moves with topic-named H2s (numbering optional): problem, evidence/context, limits of current approaches, proposed approach, implementation, business case, recommendations
- Rough word budget: problem ~200, evidence ~300, limits ~250, approach ~350, implementation ~200, business case ~200, recommendations ~150
- Formal, authoritative tone; cite data and name sources. Avoid stock titles like "Industry Context & Data" unless they fit.`,
  },
  pillar_page: {
    label: "Pillar Page",
    wordRange: "2000-3000",
    structure: `- Hero intro that defines the topic space (~200 words)
- Definition/scope H2 with a specific heading (~200 words)
- Relevance/stakes H2 (~200 words) named for the audience, not "Why X Matters in [Year]"
- 3-4 deep-dive H2s on real subtopics (~300 words each); vary length and shape
- ## Frequently Asked Questions: 5 Q&A pairs (required)
- Tools/platforms when useful
- Getting-started close (~150 words)
- Evergreen hub: comprehensive, link-worthy content`,
  },
  location_page: {
    label: "Location/Language Page",
    wordRange: "800-1200",
    structure: `- Opening that names the location and the service/product in the first sentence
- Local market context H2 (~200 words)
- Local proof / fit H2 (~150 words) with concrete signals (not "Why [Location] Businesses Choose [Brand]")
- Location-specific insights (~200 words): data, trends, or constraints
- How the offer works in that market (~150 words)
- Local CTA close (~100 words)
- Weave landmarks, regulations, or market nuance throughout`,
  },
  comparison: {
    label: "Comparison / Alternatives",
    wordRange: "1400-2000",
    structure: `- Open on the decision the reader is making (who this comparison is for)
- Criteria H2: how you evaluate options (3–6 named criteria)
- Side-by-side H2s or a comparison table for 2–4 named alternatives
- One H2 per option with honest strengths and limits (~200 words each)
- Verdict H2: who should pick what, with clear conditions
- FAQ: 3–5 decision questions
- Close on the next step for the reader (not generic "choose wisely")`,
  },
  listicle: {
    label: "Listicle",
    wordRange: "1200-1800",
    structure: `- Open with the list promise and who it helps (2–3 sentences)
- Numbered H2s for each item (5–10 items); each item: what it is, why it matters, one concrete tip
- Vary item length; do not pad weak entries
- Optional "How to choose" H2 after the list
- Close on the last useful pick, not a summary restatement`,
  },
  case_study: {
    label: "Case Study",
    wordRange: "1200-1800",
    structure: `- Context H2: company/situation, goal, constraints
- Challenge H2: what was broken or blocked (specific, not vague pain)
- Approach H2: what was done, in order, with named tactics
- Results H2: numbers or qualitative outcomes; label estimates honestly
- Lessons H2: what others can reuse
- Optional FAQ on applicability
- Proof-first tone; do not invent metrics`,
  },
  infographic_outline: {
    label: "Infographic Outline",
    wordRange: "400-600",
    structure: `- ## Infographic Title: compelling, shareable headline
- ## Hook Statistic: 1-2 surprising data points to open with
- ## Section 1: [Label]: 3-4 bullet data points or facts
- ## Section 2: [Label]: 3-4 bullet data points or facts
- ## Section 3: [Label]: 3-4 bullet data points or facts
- ## Section 4: [Label]: 3-4 bullet data points or facts
- ## Key Takeaway: 1-2 sentence summary quote
- ## Call to Action: what the viewer should do next
- Note: This is a content brief/outline for a designer, not prose. Each section is a visual panel.`,
  },
  linkedin_post: {
    label: "LinkedIn Post",
    wordRange: "1300-1800",
    structure: `- Hook: A scroll-stopping opening line (question, bold statement, or surprising fact)
 - Context: Brief explanation of why this matters to the reader
 - Main Insight: Your core perspective, lesson, or story
 - Supporting Details: Evidence, examples, or data points that back up your insight
 - Practical Takeaway: How readers can apply this information
 - Engaging Close: Question or invitation for comments to boost engagement
 - Optimal length: 1300-1800 characters for maximum engagement
 - Format: Short paragraphs (2-3 sentences max), no hashtags in body`,
  },
  twitter_thread: {
    label: "Twitter / X Thread",
    wordRange: "300-500",
    structure: `- Output 6–9 tweets as numbered blocks: "1/ …", "2/ …", etc.
- Tweet 1: scroll-stopping hook (stat, bold claim, or sharp question). End with "Thread 🧵"
- Tweets 2–N-1: one insight each; short sentences; blank line between tweets is OK inside a block
- Final tweet: practical takeaway + soft CTA (bookmark / retweet)
- EVERY tweet must be ≤ 280 characters (count the text after "N/", not the whole thread)
- Do NOT write an article. Do NOT use ## headings, FAQ, schema, or meta description.
- Format example:
1/ Hook line here. Thread 🧵

2/ Insight two…

3/ Close with CTA.`,
  },
  instagram_post: {
    label: "Instagram Post",
    wordRange: "150-300",
    structure: `- ## Caption (first 125 characters are visible before "more": make them count)
  - Hook: one striking sentence: a bold statement, relatable pain, or surprising fact
  - 3-4 short paragraphs expanding the idea (2-3 lines each, mobile-friendly)
  - Closing CTA: invite to save, share, comment, or click the link in bio
- ## Hashtag Block (separate from caption)
  - 10-15 relevant hashtags mixing high-volume (#startup, #marketing) and niche-specific tags
- ## Alt Text: one sentence describing the visual for accessibility
- Write in first-person, conversational tone. Short sentences. High energy. No corporate speak.`,
  },
  facebook_post: {
    label: "Facebook Post",
    wordRange: "150-400",
    structure: `- Hook: one engaging opening line that stops the scroll
- 2-4 short paragraphs with the core insight, story, or tip
- End with a question or CTA to drive comments
- Optional: 3-5 relevant hashtags at the end (separate line)
- Conversational, community-friendly tone. No corporate jargon.`,
  },
  bluesky_post: {
    label: "Bluesky Post",
    wordRange: "50-280",
    structure: `- Single post under 300 characters (Bluesky limit)
- Hook in the first line: opinion, insight, or question
- 1-2 short paragraphs max; plain text only (no markdown headings)
- Optional: 1-3 relevant hashtags at the end
- Conversational, punchy tone. No thread unless explicitly requested.`,
  },
  mastodon_post: {
    label: "Mastodon Post",
    wordRange: "50-500",
    structure: `- Single toot under 500 characters (or use content warning if longer concept)
- Hook first: direct statement or question for the fediverse
- Plain text; hashtags are discoverable on Mastodon: use 2-4 relevant tags
- Community-friendly, authentic tone; avoid engagement bait
- Optional content warning line if discussing sensitive topics`,
  },
  email_sequence: {
    label: "Email Sequence",
    wordRange: "800-1200",
    structure: `- ## Email 1: Welcome / Problem Awareness
  - Subject line (A/B option): two variants
  - Preview text: 80-100 characters
  - Body: warm opener, introduce the core problem, tease the solution, clear CTA
- ## Email 2: Education / Value (Day 3)
  - Subject line + preview text
  - Body: deliver the promised insight, 3 key lessons, soft CTA to explore further
- ## Email 3: Social Proof + Offer (Day 7)
  - Subject line + preview text
  - Body: case study or testimonial, bridge to the offer, strong CTA with urgency
- Write in the brand voice. Keep each email 200-400 words. Include [FIRST NAME] personalization token.`,
  },
  ad_copy: {
    label: "Ad Copy",
    wordRange: "300-500",
    structure: `- ## Google Search Ads
  - Headline 1 (30 chars max): primary keyword + value prop
  - Headline 2 (30 chars max): benefit or differentiator
  - Headline 3 (30 chars max): CTA
  - Description 1 (90 chars max): expand the benefit, include keyword
  - Description 2 (90 chars max): social proof or urgency
- ## Meta (Facebook/Instagram) Ads
  - Primary Text (125 chars ideal): hook + problem agitation
  - Headline (40 chars max): bold benefit statement
  - Description (30 chars max): supporting proof point
  - CTA button: [Book Now | Learn More | Get Started | Sign Up]
- ## 3 Headline Variations: alternative angles for A/B testing`,
  },
  landing_page_copy: {
    label: "Landing Page Copy",
    wordRange: "600-900",
    structure: `- ## Hero Section
  - H1: clear, keyword-rich headline (benefit-led, ≤ 10 words)
  - Subheadline: expand the promise (1-2 sentences)
  - Primary CTA button text + secondary link text
- ## Problem / Agitation: 2-3 short paragraphs naming the pain
- ## Solution Introduction: 2-3 paragraphs introducing the product/service
- ## Key Features (3-4 items)
  - Feature name + 1-sentence benefit description each
- ## Social Proof: 2 testimonial templates with [Name, Title, Company] placeholders
- ## FAQ (3 questions): anticipate objections
- ## Final CTA Section: headline + CTA button + urgency line`,
  },
  product_description: {
    label: "Product Description",
    wordRange: "300-500",
    structure: `- ## Product Name + Tagline (1 line)
- ## The 30-Second Pitch: 2-3 sentences: what it is, who it's for, the #1 benefit
- ## Key Benefits (3-5 bullet points): outcome-focused, not feature lists
- ## How It Works: 3-step simple explanation
- ## Who It's For: 2-3 customer personas or use cases
- ## Why Choose [Brand]: 2-3 differentiators vs. alternatives
- ## CTA: one clear next step`,
  },
  press_release: {
    label: "Press Release",
    wordRange: "500-700",
    structure: `- FOR IMMEDIATE RELEASE
- ## Headline: newsworthy, specific, keyword-rich (active voice)
- ## Subheadline: one sentence expanding the news
- [City, Date]: Opening paragraph: the 5 Ws (who, what, when, where, why) in 2-3 sentences
- ## Body Paragraph 1: context and significance of the announcement
- ## Quote from [CEO/Founder Name, Title, Company]: genuine-sounding, 2-3 sentences
- ## Body Paragraph 2: additional details, data points, or background
- ## About [Company Name]: 3-sentence boilerplate
- ### Media Contact: [Name] | [Email] | [Phone]`,
  },
  faq_article: {
    label: "FAQ / Knowledge Base",
    wordRange: "800-1200",
    structure: `- ## Introduction: 1 paragraph explaining what this FAQ covers and who it's for
- ## Frequently Asked Questions (8-12 questions)
  - Each Q&A follows this format:
    ### [Question phrased exactly as a user would type it]
    [Answer: 2-4 sentences. Clear, direct, jargon-free. Link to related resources where relevant.]
- Questions should progress from basic ("What is X?") to advanced ("How do I troubleshoot Y?")
- Include the target keyword naturally in at least 3 question/answer pairs
- ## Still Have Questions?: 1-paragraph close with CTA to contact support or book a demo`,
  },
};
