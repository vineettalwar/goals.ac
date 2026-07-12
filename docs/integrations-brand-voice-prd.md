## PRD: Brand Voice Storage, LinkedIn Quality, Integrations & Infographics

**Status:** Draft  
**Author:** AI Assistant  
**Date:** 2026-07-12  
**Version:** 1.0

---

### Executive Summary

This PRD outlines a 4-phase implementation to enhance goals.ac's content generation capabilities:

1. **Brand Voice Storage** - Store user's writing style, vocabulary, and preferences
2. **LinkedIn Post Quality** - Generate more engaging, platform-native content using brand voice
3. **Integrations Page** - Connect LinkedIn, X/Twitter, WordPress, Ghost, Medium for direct publishing
4. **Interactive Tutorials** - Step-by-step streaming tutorials with checkpoints
5. **Infographic Generation** - AI-powered infographic creation with multiple quality tiers

**Timeline:** 4 weeks  
**Dependencies:** Existing architecture supports all proposed changes

---

### Phase 1: Brand Voice Storage (Week 1)

#### 1.1 Problem Statement

Currently, brand profiles only store basic fields (company name, industry, target audience, voice/tone). Users cannot store:
- Writing examples demonstrating their style
- Preferred vocabulary and phrases
- Words/patterns to avoid
- Preferred content structure (e.g., "Hook → Insight → CTA")

This results in generic AI content that doesn't match the user's actual brand voice.

#### 1.2 Proposed Solution

**Database Schema Changes:**

Extend `brand_profiles` table:
```sql
ALTER TABLE brand_profiles ADD COLUMN writing_examples text[];
ALTER TABLE brand_profiles ADD COLUMN brand_glossary text[];
ALTER TABLE brand_profiles ADD COLUMN anti_patterns text[];
ALTER TABLE brand_profiles ADD COLUMN typical_structure text;
ALTER TABLE brand_profiles ADD COLUMN do_words text[];
ALTER TABLE brand_profiles ADD COLUMN dont_words text[];
```

**Fields Explained:**

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `writing_examples` | text[] | 3-5 user-provided writing samples | ["Our mission is to...", "We believe that..."] |
| `brand_glossary` | text[] | Words/phrases they commonly use | ["fractional CTO", "tech strategy", "ROI first"] |
| `anti_patterns` | text[] | Words/patterns to avoid | ["synergy", "leverage", "circle back"] |
| `typical_structure` | text | Default content structure | "Hook → Problem → Solution → CTA" |
| `do_words` | text[] | Preferred vocabulary | ["actionable", "practical", "proven"] |
| `dont_words` | text[] | Forbidden vocabulary | ["revolutionary", "game-changing", "disrupt"] |

#### 1.3 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/website-projects/:id/brand-profile/voice` | Get brand voice settings |
| PUT | `/api/website-projects/:id/brand-profile/voice` | Update brand voice settings |
| POST | `/api/website-projects/:id/brand-profile/voice/analyze` | AI-analyze writing examples to extract style |

#### 1.4 UI Design

**Location:** Project Settings → Brand Profile → "Brand Voice" tab

**Components:**
- Text area for writing examples (one per line)
- Tag input for glossary words
- Tag input for anti-patterns
- Dropdown for typical structure presets
- Visual editor for do/don't words

#### 1.5 Integration with Content Generation

Update all content generators to:
1. Fetch `brand_profiles.writing_examples` + `brand_glossary` + `anti_patterns`
2. Inject into system prompt: "Write in the style of these examples..."
3. Add constraint: "Use these words where appropriate: [glossary]"
4. Add constraint: "NEVER use these words: [anti_patterns]"

**Example Prompt Injection:**
```
BRAND VOICE EXAMPLES:
1. "Our mission is to help founders scale..."
2. "We believe in practical, ROI-driven solutions..."
3. "Tech strategy isn't about buzzwords—it's about results..."

VOCABULARY TO USE: fractional CTO, tech strategy, ROI-first, actionable
WORDS TO AVOID: synergy, leverage, circle back, disrupt, revolutionary

Match the conversational yet professional tone. Be direct. No fluff.
```

#### 1.6 Files to Modify

| File | Change |
|------|--------|
| `lib/db/src/schema/brand_profiles.ts` | Add new columns |
| `lib/db/migrations/` | Create migration file |
| `artifacts/api-server/src/routes/websiteProjects.ts` | Add brand voice endpoints |
| `artifacts/api-server/src/services/contentStudioGenerator.ts` | Use brand voice in prompts |
| `artifacts/goals-ac/src/pages/project-detail.tsx` | Add Brand Voice tab |

---

### Phase 2: LinkedIn Post Quality (Week 1-2)

#### 2.1 Problem Statement

Current LinkedIn post generation:
- Generic prompt: "Write a professional LinkedIn post"
- No hook templates
- No post archetypes
- Doesn't use brand voice
- Single output style

Result: Generic posts that don't stand out in the feed.

#### 2.2 Proposed Solution

**2.2.1 Post Archetypes**

Define 5 archetypes users can select:

| Archetype | Description | Example Hook |
|-----------|-------------|--------------|
| **Listicle** | Numbered insights | "3 things I learned about X..." |
| **Mini Case Study** | Client/success story | "Last week we helped a client Y..." |
| **Hot Take** | Contrarian viewpoint | "Unpopular opinion: X is actually..." |
| **Personal Story** | Journey/confession | "5 years ago I was X, then Y happened..." |
| **Educational** | How-to insight | "Here's the exact framework we use for Y..." |

**2.2.2 Hook Templates**

| Hook Type | Template | Strength Score |
|-----------|----------|-----------------|
| Bold Question | "What if [statement]?" | High (stops scroll) |
| Contrarian Take | "Most [audience] get [topic] wrong." | Very High |
| Surprising Stat | "83% of [audience] fail because of [reason]." | High |
| Personal Confession | "I used to do X. Here's why I stopped." | Medium |
| Controversial | "Hot take: [statement]" | High (but risky) |

**2.2.3 Enhanced Prompt Structure**

```typescript
const LINKEDIN_PROMPT = `
You are an expert LinkedIn content strategist.

BRAND VOICE:
${brandVoiceExamples}

VOCABULARY:
Use: ${doWords.join(', ')}
Avoid: ${dontWords.join(', ')}

ARCHETYPE: ${selectedArchetype}
HOOK TYPE: ${hookType}

STRUCTURE FOR ${selectedArchetype}:
${archetypeStructure}

OPTIMAL LENGTH: 1300-1800 characters (for maximum engagement)

REQUIREMENTS:
1. Start with hook that stops scroll
2. Break into short paragraphs (2-3 sentences max)
3. Include specific insight/example
4. End with engagement question or insight
5. NO hashtags in body (add at end)
6. NO corporate speak

OUTPUT FORMAT:
{
  "hook": "<first line only>",
  "body": "<full post text>",
  "hashtags": ["<5-10 relevant hashtags>"],
  "characterCount": <number>,
  "suggestedImageAlt": "<alt text for optional image>"
}
`;
```

**2.2.4 Preview Improvements**

- Character count indicator (target: 1300-1800)
- Hook strength score (1-10)
- Hashtag density warning
- Mobile preview
- "Post sanity check" button (AI rates post quality)

#### 2.3 Files to Modify

| File | Change |
|------|--------|
| `artifacts/api-server/src/services/contentStudioGenerator.ts` | Add LinkedIn archetype prompts |
| `artifacts/goals-ac/src/pages/content-studio.tsx` | Add archetype/hook selectors |
| `artifacts/goals-ac/src/components/linkedin-preview.tsx` | New preview component |

---

### Phase 3: Integrations Page (Week 2-3)

#### 3.1 Problem Statement

Users cannot directly publish generated content to:
- LinkedIn
- X/Twitter
- Medium (API deprecated)
- Beyond basic Notion/Webflow/WordPress (existing but minimal UI)

This forces manual copy-paste workflow.

#### 3.2 Platform Research Summary

| Platform | API Status | Auth Method | Cost | Publishing Type |
|----------|-----------|------------|------|------------------|
| **LinkedIn** | ✅ Active | OAuth 2.0 | Free | Posts, Articles |
| **Twitter/X** | ✅ Active | OAuth 2.0 + PKCE | $0.015/tweet | Tweets, Threads |
| **WordPress** | ✅ Active | REST API | Free | Posts (existing) |
| **Notion** | ✅ Active | API Token | Free | Pages (existing) |
| **Webflow** | ✅ Active | API Token | Free | CMS Items (existing) |
| **Ghost** | ✅ Active | Admin API | Free | Posts |
| **Medium** | ❌ Deprecated | N/A | N/A | No API |

#### 3.3 Database Schema

**Extend existing `cmsIntegrations` JSONB:**

```typescript
interface CmsIntegrationCredentials {
  // Existing
  notion?: {
    integrationToken: string;      // ENCRYPTED
    databaseId: string;
  };
  webflow?: {
    apiToken: string;              // ENCRYPTED
    collectionId: string;
    bodyFieldSlug: string;
  };
  wordpress?: {
    apiUrl: string;               // NOT encrypted (public URL)
    username: string;             // NOT encrypted
    applicationPassword: string;  // ENCRYPTED
    defaultCategoryId?: number;
  };
  
  // NEW
  linkedin?: {
    accessToken: string;          // ENCRYPTED
    refreshToken?: string;        // ENCRYPTED
    expiresAt?: number;           // NOT encrypted (timestamp)
    authorUrn?: string;           // NOT encrypted
  };
  twitter?: {
    accessToken: string;          // ENCRYPTED
    refreshToken?: string;        // ENCRYPTED
    expiresAt?: number;
    userId?: string;
    screenName?: string;
  };
  ghost?: {
    adminApiUrl: string;          // NOT encrypted
    apiKey: string;              // ENCRYPTED
  };
}
```

#### 3.4 OAuth Implementation

**LinkedIn OAuth Flow:**

```
1. GET /api/auth/linkedin
   → Redirect to LinkedIn consent screen
   → Scopes: r_liteprofile, w_member_social, r_emailaddress
   
2. User authorizes
   → LinkedIn redirects to /api/auth/linkedin/callback?code=...&state=...
   
3. GET /api/auth/linkedin/callback
   → Exchange code for access_token
   → Store encrypted in cmsIntegrations.linkedin
   → Redirect to /settings/integrations?linkedin=connected
   
4. Token refresh (automatic on publish):
   POST /api/auth/linkedin/refresh
   → Use refresh_token to get new access_token
   → Tokens valid for 60 days
```

**Twitter/X OAuth Flow:**

```
1. GET /api/auth/twitter
   → Generate PKCE code_verifier + code_challenge
   → Store code_verifier in session
   → Redirect to X authorization

2. User authorizes
   → X redirects to /api/auth/twitter/callback?code=...&state=...
   
3. GET /api/auth/twitter/callback
   → Exchange code + code_verifier for tokens
   → Scopes: tweet.read, tweet.write, users.read, offline.access
   → Store encrypted in cmsIntegrations.twitter
   
4. Token refresh:
   POST /api/auth/twitter/refresh
   → Access tokens: 2 hours
   → Refresh tokens: indefinite (with offline.access)
```

#### 3.5 Connectors Architecture

**File Structure:**
```
lib/connectors/src/
├── index.ts           # Re-export all connectors
├── notion.ts          # (existing)
├── webflow.ts         # (existing)
├── wordpress.ts       # (existing)
├── ghost.ts           # NEW
├── linkedin.ts        # NEW
├── twitter.ts         # NEW
└── types.ts           # Shared interfaces
```

**LinkedIn Connector (NEW):**

```typescript
// lib/connectors/src/linkedin.ts
import { encryptSecret, decryptSecret } from '@workspace/security/encryption';

export async function publishToLinkedIn(
  accessToken: string,
  authorUrn: string,
  title: string,
  bodyMarkdown: string,
  options?: {
    visibility?: 'PUBLIC' | 'CONNECTIONS';
    isDraft?: boolean;
  }
): Promise<{
  postId: string;
  postUrl: string;
}> {
  // 1. SSRF protection
  await assertPublicUrl('https://api.linkedin.com');
  
  // 2. Convert markdown to LinkedIn format (plain text, no formatting)
  const text = bodyMarkdown
    .replace(/^#+\s+/gm, '')  // Remove headers
    .replace(/\*\*/g, '')      // Remove bold
    .replace(/\n{3,}/g, '\n\n');  // Normalize line breaks
  
  // 3. Create post
  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Linkedin-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: authorUrn,
      commentary: text.slice(0, 3000),  // LinkedIn limit
      visibility: options?.visibility ?? 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
      },
      lifecycleState: options?.isDraft ? 'DRAFT' : 'PUBLISHED',
    }),
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('LinkedIn token expired. Reconnect in Settings.');
    }
    throw new Error(`LinkedIn API error: ${response.status}`);
  }
  
  const data = await response.json();
  const postId = data.id;
  
  return {
    postId,
    postUrl: `https://www.linkedin.com/feed/update/${postId}`,
  };
}
```

**Twitter Connector (NEW):**

```typescript
// lib/connectors/src/twitter.ts
export async function publishThreadToTwitter(
  accessToken: string,
  tweets: string[],
): Promise<string[]> {
  const postUrls: string[] = [];
  let previousTweetId: string | undefined;
  
  for (const tweetText of tweets) {
    const body: any = {
      text: tweetText.slice(0, 280),  // Twitter limit
    };
    
    if (previousTweetId) {
      body.reply = { in_reply_to_tweet_id: previousTweetId };
    }
    
    const response = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }
    
    const data = await response.json();
    previousTweetId = data.data.id;
    postUrls.push(`https://x.com/status/${data.data.id}`);
  }
  
  return postUrls;
}
```

#### 3.6 Integration Settings UI

**Page:** `/settings/integrations`

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Integrations                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ LinkedIn                                    [Connect]│    │
│  │ Post articles and updates to your LinkedIn profile   │    │
│  │                                                      │    │
│  │ Status: ○ Not connected                             │    │
│  │         ● Connected as @username                     │    │
│  │         ⚠ Token expired - reconnect                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
��  ┌─────────────────────────────────────────────────────┐    │
│  │ X / Twitter                                 [Connect]│    │
│  │ Post threads and updates to your X profile          │    │
│  │ Cost: $0.015 per tweet                              │    │
│  │                                                      │    │
│  │ Status: ● Connected as @handle                       │    │
│  │         [Test Connection]  [Disconnect]             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ WordPress                            [Configure]     │    │
│  │ Post directly to your WordPress blog                │    │
│  │                                                      │    │
│  │ Status: ● Connected to blog.example.com             │    │
│  │ Default status: [Draft ▼]                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Medium                                [Coming Soon]  │    │
│  │ Medium's API is deprecated. Use export feature.     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 3.7 Publishing Flow

**From Content Studio:**

```
1. User generates LinkedIn post
2. Clicks "Publish to LinkedIn" button
3. Modal appears:
   ┌──────────────────────────────────────┐
   │ Publish to LinkedIn                  │
   │                                      │
   │ Preview:                             │
   │ "3 things I learned..."              │
   │                                      │
   │ Post as: ○ Immediate                 │
   │          ○ Draft (review later)      │
   │                                      │
   │ [Cancel]  [Publish Now]              │
   └──────────────────────────────────────┘
4. On success:
   → Toast: "Published to LinkedIn!"
   → Link: "View post" → opens LinkedIn
   → Update content piece status: "published"
   → Store: publishedUrl, publishedAt
```

#### 3.8 Cost Considerations

| Platform | Cost | Usage Estimate | Monthly Cost |
|----------|------|----------------|--------------|
| LinkedIn | Free | 20 posts/month | $0 |
| Twitter/X | $0.015/post | 20 tweets/month | $0.30 |
| WordPress | Free | 10 posts/month | $0 |
| Notion | Free | 10 pages/month | $0 |
| **Total** | | | **~$0.30/month** |

Twitter/X cost warning should be shown before connecting.

#### 3.9 Files to Create/Modify

| File | Change |
|------|--------|
| `lib/connectors/src/linkedin.ts` | NEW connector |
| `lib/connectors/src/twitter.ts` | NEW connector |
| `lib/connectors/src/ghost.ts` | NEW connector |
| `lib/db/src/schema/website_projects.ts` | Extend cmsIntegrations type |
| `artifacts/api-server/src/routes/auth.ts` | Add LinkedIn/Twitter OAuth routes |
| `artifacts/api-server/src/routes/contentPieces.ts` | Add publish endpoints |
| `artifacts/goals-ac/src/pages/settings.tsx` | Create Integrations tab |
| `artifacts/goals-ac/src/pages/content-studio.tsx` | Add publish buttons |

---

### Phase 4: Interactive Tutorials (Week 3)

#### 4.1 Problem Statement

Current tutorial format generates static markdown. No:
- Step-by-step streaming
- Interactive checkpoints
- Code execution verification
- Progress tracking

#### 4.2 Proposed Solution

**Streaming Tutorial Format:**

```typescript
interface TutorialStep {
  stepNumber: number;
  title: string;
  content: string;
  codeBlock?: {
    language: 'typescript' | 'python' | 'bash' | 'sql';
    code: string;
    filename?: string;
    runnable?: boolean;  // Can user test this?
  };
  checkpoint?: {
    question: string;
    type: 'confirmation' | 'quiz' | 'code-output';
    expectedAnswer?: string;
  };
  estimatedTime: number;  // Minutes
}
```

**Enhanced Prompt:**

```typescript
const TUTORIAL_PROMPT = `
Generate an interactive step-by-step tutorial.

TARGET: ${targetAudience}
TOPIC: ${topic}
SKILL LEVEL: ${skillLevel}

For each step, include:
1. Clear title (imperative: "Install dependencies")
2. Explanation (2-3 sentences)
3. Code block (if applicable) with:
   - Language syntax highlighting
   - Runnable flag if user can test locally
   - Filename for context
4. Checkpoint question (verify understanding)
5. Estimated time

OUTPUT FORMAT:
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "...",
      "content": "...",
      "codeBlock": { "language": "...", "code": "...", "runnable": true },
      "checkpoint": { "question": "..." },
      "estimatedTime": 5
    }
  ],
  "totalTime": 30,
  "prerequisites": ["...", "..."],
  "learningOutcomes": ["...", "..."]
}
`;
```

#### 4.3 UI Components

**Tutorial Viewer:**

```
┌─────────────────────────────────────────────────────────────┐
│  Tutorial: Deploy Next.js to Cloudflare Workers             │
│  ████████░░░░░░░░░░░░░  Step 3/15  (~45 min total)         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 3: Configure wrangler.toml                             │
│  ─────────────────────────────────────                      │
│                                                              │
│  Create a wrangler.toml file to configure your deployment.   │
│  This file tells Cloudflare about your project settings.    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ wrangler.toml                                   [Copy]  │ │
│  │ name = "my-next-app"                                   │ │
│  │ main = "src/worker.ts"                                  │ │
│  │ compatibility_date = "2024-01-01"                       │ │
│  │                                                         │ │
│  │ [site]                                                  │ │
│  │ bucket = "./dist"                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ☐ Checkpoint: Did you create wrangler.toml?                 │
│     [Yes, created!]                                          │
│                                                              │
│  [← Previous]  [Mark Complete & Next →]                      │
│                                                              │
└────────────────────────────────────────────────────���────────┘
```

#### 4.4 Streaming Implementation

**Backend:**

```typescript
// Stream each step as it's generated
for await (const step of generateTutorialStream(params)) {
  yield `event: step\ndata: ${JSON.stringify(step)}\n\n`;
}
```

**Frontend:**

```typescript
// Progressive rendering
useEffect(() => {
  const eventSource = new EventSource('/api/tutorials/generate/stream');
  
  eventSource.addEventListener('step', (e) => {
    const step = JSON.parse(e.data);
    setSteps(prev => [...prev, step]);
  });
  
  return () => eventSource.close();
}, []);
```

#### 4.5 Files to Modify

| File | Change |
|------|--------|
| `artifacts/api-server/src/services/contentStudioGenerator.ts` | Add tutorial streaming |
| `artifacts/goals-ac/src/components/tutorial-viewer.tsx` | NEW component |
| `artifacts/goals-ac/src/pages/content-studio.tsx` | Use TutorialViewer |

---

### Phase 5: Infographic Generation (Week 4)

#### 5.1 Problem Statement

Current `infographic_outline` format:
- Generates text-only outline (400-600 words)
- Marked as "ready for designer"
- Requires manual design work
- No actual visual output

Users want AI-generated infographics they can use immediately.

#### 5.2 Provider Research Summary

| Provider | Model | Cost/Image | Typography | Speed | Infographic Suitability |
|----------|-------|-----------|------------|-------|-------------------------|
| **OpenAI** | GPT Image 2 | $0.04 | Excellent (9/10) | 10-20s | High |
| **Replicate** | FLUX Schnell | $0.003 | Good (7/10) | 1-3s | Medium (drafts) |
| **Replicate** | Ideogram v3 | $0.09 | Excellent (10/10) | 15-25s | Very High (production) |
| **Gemini** | Flash Image | Variable | Good (7/10) | 5-15s | Medium (existing) |

**Recommendation:**
- **Primary (MVP):** Gemini Flash Image (already integrated, no new dependencies)
- **Premium:** Ideogram v3 via Replicate (best typography)
- **Fast Draft:** FLUX Schnell via Replicate (lowest cost)

#### 5.3 Architecture

**Extend `AiProviderClient`:**

```typescript
export interface ImageGenerateParams {
  prompt: string;
  model?: 'gemini' | 'ideogram-v3' | 'flux-schnell';
  size?: '1024x1024' | '2048x2048';
  style?: 'infographic' | 'minimal' | 'illustrated';
  brandColors?: string[];  // Hex colors from brand profile
}

export interface ImageGenerateResult {
  b64_json: string;      // Base64-encoded image
  mimeType: string;       // 'image/png' | 'image/jpeg'
  provider: string;       // Which provider generated it
  cost: number;          // Actual cost incurred
}

export interface AiProviderClient {
  generate(params: GenerateParams): Promise<GenerateResult>;
  generateStream?(params: GenerateParams): AsyncGenerator<string>;
  generateImage?(params: ImageGenerateParams): Promise<ImageGenerateResult>;  // NEW
}
```

#### 5.4 Infographic Prompt Engineering

**Convert outline to image prompt:**

```typescript
function buildInfographicPrompt(outline: string, brandProfile: BrandProfile): string {
  return `
Create a professional B2B infographic with this structure:

${outline}

DESIGN REQUIREMENTS:
- Style: Clean, modern, professional
- Typography: Bold headers, readable body text (min 14pt)
- Colors: ${brandProfile.brandColors ?? 'Professional blue palette with accent'}
- Layout: Vertical flow, clear visual hierarchy
- Icons: Use simple geometric icons for each section
- Data visualization: Charts/graphs should be clean and easy to read

TECHNICAL:
- Size: 1200x1600px (Pinterest/LinkedIn optimal)
- Format: High contrast for readability
- Text: All text must be clearly legible
- No watermarks
  `.trim();
}
```

#### 5.5 User Options

**In Content Studio:**

```
┌─────────────────────────────────────────────────────────────┐
│  Generate Infographic                                        │
│                                                              │
│  Output format:                                              │
│  ○ Outline only (free)                                       │
│    Designer-ready structured brief                           │
│                                                              │
│  ● Generate with AI artwork                                  │
│    Quality: [Premium (Ideogram) ▼]  (~$0.10)                 │
│    ○ Draft (FLUX)           (~$0.01)                        │
│    ○ Premium (Ideogram)     (~$0.10)                        │
│    ○ Enterprise (DALL-E 3)  (~$0.04)                        │
│                                                              │
│  Brand colors: [Auto-detect from logo ▼]                    │
│                                                              │
│  [Generate]                                                   │
└─────────────────────────────────────────────────────────────┘
```

#### 5.6 Cost Management

**Strategies:**

1. **User BYOK** (Bring Your Own Key):
   - User provides Replicate/Fal API key
   - Stored encrypted, used for their generations
   - No platform cost

2. **Subscription tiers:**
   - Free: 5 draft infographics/month
   - Pro: 20 premium infographics/month included
   - Enterprise: Unlimited

3. **Pay-per-use:**
   - Drafts: $0.02 (cost + margin)
   - Premium: $0.15 (cost + margin)

#### 5.7 Workflow

**Generation Flow:**

```
1. User enters topic + selects format: "infographic"
2. System generates outline (existing)
3. If "with AI artwork" selected:
   a. Convert outline to image prompt
   b. Call image provider API
   c. Return outline + generated image
4. Display:
   - Text outline (editable)
   - Generated image (downloadable)
   - Alt text (for accessibility)
```

#### 5.8 Files to Create/Modify

| File | Change |
|------|--------|
| `lib/ai-providers/src/client.ts` | Add generateImage interface |
| `lib/ai-providers/src/replicate-image.ts` | NEW Replicate client |
| `artifacts/api-server/src/services/infographicGenerator.ts` | NEW service |
| `artifacts/api-server/src/routes/contentPieces.ts` | Add infographic generation |
| `artifacts/goals-ac/src/components/infographic-viewer.tsx` | NEW component |
| `artifacts/goals-ac/src/pages/content-studio.tsx` | Add infographic options |

---

### Technical Architecture

#### Dependencies

**New packages:**

```json
{
  "dependencies": {
    "replicate": "^0.25.0",           // For FLUX/Ideogram
    "@aspect-ratio/core": "^1.0.0"    // Image sizing utilities
  }
}
```

**Environment variables:**

```bash
# Existing
GEMINI_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434

# NEW
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
REPLICATE_API_TOKEN=...        # Optional, for premium infographics
```

#### Security Considerations

1. **OAuth tokens:** Encrypt with AES-256-GCM before storing
2. **API keys:** Never log or expose in error messages
3. **Rate limiting:** Implement per-user limits on OAuth API calls
4. **Token refresh:** Automatic refresh before expiry (24h buffer)
5. **Webhook signatures:** Verify all incoming webhook signatures

#### Performance Targets

| Endpoint | Target P95 |
|----------|-------------|
| Brand voice CRUD | <100ms |
| Content generation | <30s |
| LinkedIn publish | <5s |
| Twitter thread publish | <10s (5 tweets) |
| Infographic (draft) | <10s |
| Infographic (premium) | <30s |

---

### Success Metrics

#### Phase 1: Brand Voice

- Metric: % of content pieces using brand voice
- Target: 80% within 30 days of launch
- Measurement: Track usage in generation logs

#### Phase 2: LinkedIn Quality

- Metric: Avg. engagement rate on published posts
- Baseline: Industry avg (2%)  
- Target: 4% (2x improvement)

#### Phase 3: Integrations

- Metric: % of content published via integrations vs manual
- Target: 50% within 60 days
- Measurement: Track publish method in content_pieces table

#### Phase 4: Tutorials

- Metric: Tutorial completion rate
- Target: 70%
- Measurement: Track step completion in analytics

#### Phase 5: Infographics

- Metric: % of infographics generated with AI vs outline-only
- Target: 60% with AI artwork
- Measurement: Track output format in generation logs

---

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LinkedIn API changes | Medium | High | Abstract behind interface, support multiple auth methods |
| Twitter cost overruns | Medium | Medium | User quotas, spending alerts, BYOK option |
| Image quality inconsistent | High | Medium | Iterate prompts, fallback providers, user feedback loop |
| OAuth token expiration | High | High | Automatic refresh, proactive re-auth UX |
| Brand voice overfitting | Medium | Low | Temperature tuning, prompt diversity |

---

### Appendices

#### A. LinkedIn OAuth Scopes Explained

```
r_liteprofile     - Read name, headline, photo
r_emailaddress    - Read email for account matching
w_member_social   - Post on behalf of member (REQUIRED for posting)
w_organization_social - Post as organization (needs company admin)
```

#### B. Twitter OAuth Scopes

```
tweet.read      - View tweets
tweet.write     - Create/delete tweets
users.read      - View profile
offline.access  - Get refresh token (REQUIRED for long-term)
```

#### C. Example LinkedIn Post JSON

```json
{
  "author": "urn:li:person:ABC123",
  "commentary": "3 things I learned about scaling tech teams...",
  "visibility": "PUBLIC",
  "distribution": {
    "feedDistribution": "MAIN_FEED"
  },
  "lifecycleState": "PUBLISHED"
}
```

#### D. Example Replicate API Call

```typescript
import Replicate from 'replicate';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const output = await replicate.run(
  "black-forest-labs/flux-schnell",
  {
    input: {
      prompt: "Professional infographic about AI adoption...",
      go_fast: true,
      num_outputs: 1,
      aspect_ratio: "3:4",
      output_format: "png"
    }
  }
);
```

#### E. Database Migration

```sql
-- Migration: 20260712_add_brand_voice_fields.sql

ALTER TABLE brand_profiles 
  ADD COLUMN writing_examples text[],
  ADD COLUMN brand_glossary text[],
  ADD COLUMN anti_patterns text[],
  ADD COLUMN typical_structure text,
  ADD COLUMN do_words text[],
  ADD COLUMN dont_words text[];

-- Add comment
COMMENT ON COLUMN brand_profiles.writing_examples IS '3-5 user-provided writing samples for style training';
COMMENT ON COLUMN brand_profiles.brand_glossary IS 'Words/phrases commonly used by the brand';
COMMENT ON COLUMN brand_profiles.anti_patterns IS 'Words/patterns to avoid in generated content';
```

---

### Implementation Checklist

#### Phase 1: Brand Voice (5 days)

- [ ] Create database migration
- [ ] Update TypeScript interfaces
- [ ] Add Zod schemas
- [ ] Implement API endpoints
- [ ] Create Brand Voice tab UI
- [ ] Integrate with content generation prompts
- [ ] Write tests
- [ ] Document new fields

#### Phase 2: LinkedIn Quality (3 days)

- [ ] Define archetype prompts
- [ ] Add archetype selector in UI
- [ ] Improve hook generation
- [ ] Add character count indicator
- [ ] Add hook strength scorer
- [ ] Preview improvements
- [ ] Test with brand voice

#### Phase 3: Integrations (7 days)

- [ ] LinkedIn OAuth implementation
- [ ] Twitter OAuth implementation
- [ ] LinkedIn connector
- [ ] Twitter connector
- [ ] Ghost connector
- [ ] Integration settings page
- [ ] Publish buttons in content studio
- [ ] Test publishing flows
- [ ] Add usage tracking

#### Phase 4: Interactive Tutorials (3 days)

- [ ] Update tutorial prompt
- [ ] Create TutorialViewer component
- [ ] Implement streaming
- [ ] Add checkpoint logic
- [ ] Progress tracking
- [ ] Test with various topics

#### Phase 5: Infographics (5 days)

- [ ] Extend AiProviderClient interface
- [ ] Create Replicate client
- [ ] Build infographic prompt engine
- [ ] Add image generation UI options
- [ ] Implement cost tracking
- [ ] Test multiple providers
- [ ] Add download/share features

---

### Open Questions

1. **Twitter/X cost allocation** - Should platform pay or user?
   - Recommendation: User BYOK or subscription-based allowance

2. **Brand voice training** - Should users upload existing writing samples, or write new ones?
   - Recommendation: Both - upload existing + write new guided prompt

3. **Integration permissions** - Per-user or per-project?
   - Recommendation: Per-user, with project-level overrides

4. **Infographic pricing** - Included in subscription or à la carte?
   - Recommendation: Subscription tiers (5 drafts free, premium paid)

5. **Publishing audit trail** - How long to keep publish logs?
   - Recommendation: 90 days full, then summary only

---

### Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-07-12 | AI Assistant | Initial PRD |

---

This PRD provides a comprehensive roadmap for implementing brand voice storage, LinkedIn quality improvements, integrations, interactive tutorials, and infographic generation over a 4-week period. Each phase builds on existing architecture while adding significant new capabilities.

Ready to begin implementation when approved.