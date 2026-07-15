export type HelpAudience = "user" | "admin";

export type HelpCategory =
  | "Getting started"
  | "Social publishing"
  | "Self-hosted admin";

export type HelpArticle = {
  slug: string;
  title: string;
  description: string;
  category: HelpCategory;
  audience: HelpAudience;
  cta?: { label: string; href: string };
  body: string;
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "connect-wordpress",
    title: "Connect WordPress to goals.ac",
    description: "Install the plugin or use application passwords to publish from Content Studio.",
    category: "Getting started",
    audience: "user",
    cta: { label: "CMS publishing", href: "/cms-publishing" },
    body: `WordPress supports two connection methods: **goals.ac plugin** (recommended) or **REST API** with application passwords.

**Plugin (recommended)**
1. Install the goals.ac plugin on your WordPress site
2. Open **Projects** → your project → **Publishing**
3. Choose WordPress → **Plugin** connection method
4. Paste your site URL and site key from the plugin settings
5. Click **Test connection**

**REST API**
1. In WordPress admin, create an **Application Password** for your user
2. In goals.ac Publishing tab, choose **REST API**
3. Enter site URL, username, and application password

Published articles support Gutenberg, Elementor, and Divi output modes per connection.`,
  },
  {
    slug: "connect-shopify",
    title: "Connect Shopify blog publishing",
    description: "Publish SEO articles to your Shopify store blog via Admin API or plugin.",
    category: "Getting started",
    audience: "user",
    cta: { label: "Platform integrations", href: "/platform-integrations" },
    body: `Shopify publishing targets your store's **blog** (Online Store → Blog posts).

**Admin API**
1. Create a custom app in Shopify Admin with \`write_content\` scope
2. Copy the Admin API access token
3. In goals.ac **Publishing**, add Shopify credentials: shop domain + token
4. Optionally specify a blog ID (first blog is used if omitted)

**Plugin**
1. Install the goals.ac Shopify app on your store
2. Connect via site URL + site key in the Publishing tab

Articles publish as HTML with optional meta description and tags.`,
  },
  {
    slug: "connect-headless-cms",
    title: "Connect headless CMS (Contentful, Sanity, Strapi)",
    description: "Map fields and publish canonical HTML to your headless content model.",
    category: "Getting started",
    audience: "user",
    cta: { label: "Content Engine", href: "/content-engine" },
    body: `Headless CMS connections use management tokens and field mapping.

**Contentful**
1. Create a Management API token with access to your space
2. Add space ID, environment, and content type ID in Publishing settings
3. Map title, body, and slug fields (defaults: title, body, slug)

**Sanity**
1. Create a project token with write access
2. Add project ID, dataset, and document type
3. Map fields — slug is stored as Sanity slug object

**Strapi**
1. Generate an API token for your collection type
2. Enter Strapi base URL and token

Use **Render preview** on any content piece to verify the payload before publishing.`,
  },
  {
    slug: "connect-linkedin",
    title: "Connect LinkedIn to goals.ac",
    description: "Link your LinkedIn account to publish posts from Content Studio.",
    category: "Social publishing",
    audience: "user",
    cta: { label: "Open projects", href: "/projects" },
    body: `LinkedIn publishing uses OAuth — you authorize goals.ac once per project, and we store encrypted tokens.

**Steps**
1. Open **Projects** and select your website project
2. Go to the **Publishing** tab
3. Click **Connect LinkedIn** on the LinkedIn card
4. Sign in to LinkedIn and approve the requested permissions
5. You should return to the Publishing tab with a green **Connected** badge

**Publish a LinkedIn post**
1. Open **Content Studio** (or a content piece)
2. Create or open a piece with format **LinkedIn Post**
3. Choose **LinkedIn** as the publish destination
4. Click **Publish**

**Notes**
- Connections are **per project**, not account-wide
- Use **Test connections** on the Publishing tab to verify health
- If publish fails, see [Social publishing troubleshooting](/help/social-publishing-troubleshooting)`,
  },
  {
    slug: "connect-x-twitter",
    title: "Connect X (Twitter) to goals.ac",
    description: "Authorize X to publish threads directly from Content Studio.",
    category: "Social publishing",
    audience: "user",
    cta: { label: "Open projects", href: "/projects" },
    body: `X publishing uses OAuth 2 with PKCE. goals.ac stores encrypted access and refresh tokens on your project.

**Steps**
1. Open **Projects** → your project → **Publishing**
2. Click **Connect X** on the X card
3. Approve the app in X's authorization screen
4. Confirm the **Connected** badge appears

**Publish a thread**
1. Create content with format **Twitter Thread**
2. Write your thread in markdown — separate tweets with blank lines or \`---\`
3. Select **X** as the destination and click **Publish**

**Notes**
- Thread splitting follows Content Studio markdown structure
- X API tier limits may apply to your developer app (self-hosted admins: see admin guide)`,
  },
  {
    slug: "connect-meta-facebook-instagram",
    title: "Connect Facebook & Instagram via Meta",
    description: "Connect a Facebook Page and linked Instagram Business account.",
    category: "Social publishing",
    audience: "user",
    cta: { label: "Open projects", href: "/projects" },
    body: `Meta OAuth connects a **Facebook Page**. If that Page has a linked **Instagram Business** account, you can publish to both.

**Prerequisites**
- A Facebook Page (not just a personal profile)
- Instagram account converted to **Business** or **Creator**
- Instagram linked to your Facebook Page in Meta Business settings

**Steps**
1. **Projects** → your project → **Publishing**
2. Click **Connect Meta**
3. Sign in with Facebook and grant permissions
4. Select the **Facebook Page** to use
5. Confirm Page name (and Instagram @handle if linked) appears

**Publish**
- **Facebook Post** format → publish to Page feed
- **Instagram Post** format → publishes caption with a placeholder image (Instagram API requires media)

**Instagram text-only limitation**
Instagram's Graph API requires an image or video. goals.ac v1 uses a placeholder image for text posts. Attach custom media support is planned.`,
  },
  {
    slug: "connect-bluesky",
    title: "Connect Bluesky to goals.ac",
    description: "Authorize Bluesky via AT Protocol OAuth to publish skeets.",
    category: "Social publishing",
    audience: "user",
    cta: { label: "Open projects", href: "/projects" },
    body: `Bluesky uses AT Protocol OAuth. You connect with your Bluesky handle (e.g. \`you.bsky.social\`).

**Steps**
1. **Projects** → your project → **Publishing**
2. On the **Bluesky** card, enter your handle
3. Click **Connect Bluesky**
4. Complete authorization on Bluesky
5. Return to Publishing with **Connected** status

**Publish**
1. Create a **Bluesky Post** in Content Studio (under 300 characters)
2. Select **Bluesky** and click **Publish**

**Self-hosted note**
If OAuth fails, your admin may need to configure Bluesky client metadata — see [Bluesky OAuth client setup](/help/admin-bluesky-oauth-client).`,
  },
  {
    slug: "connect-mastodon",
    title: "Connect Mastodon to goals.ac",
    description: "Connect your Mastodon instance to publish toots from Content Studio.",
    category: "Social publishing",
    audience: "user",
    cta: { label: "Open projects", href: "/projects" },
    body: `Mastodon is federated — you connect to **your instance** (e.g. \`mastodon.social\`, \`hachyderm.io\`).

**Steps**
1. **Projects** → your project → **Publishing**
2. On the **Mastodon** card, enter your instance URL (hostname only is fine)
3. Click **Connect Mastodon**
4. Authorize goals.ac on your instance
5. Confirm your @username and instance appear

**Publish**
1. Create a **Mastodon Post** (500 characters recommended)
2. Select **Mastodon** and click **Publish**

**Instance restrictions**
Some instances disable dynamic app registration. Ask your instance admin or see [Mastodon OAuth for self-hosted](/help/admin-mastodon-oauth).`,
  },
  {
    slug: "publish-social-content",
    title: "Publish social content from Content Studio",
    description: "End-to-end workflow: generate, review, and publish to social platforms.",
    category: "Getting started",
    audience: "user",
    cta: { label: "Go to dashboard", href: "/dashboard" },
    body: `**1. Connect destinations**
Open your project → **Publishing** tab. Connect LinkedIn, X, Meta, Bluesky, and/or Mastodon as needed. Each platform has its own setup guide in Help.

**2. Generate content**
In Content Studio, pick a social format:
- LinkedIn Post
- Twitter Thread
- Facebook Post
- Instagram Post
- Bluesky Post
- Mastodon Post

**3. Review the draft**
Edit markdown, check length limits, and confirm brand voice before publishing.

**4. Publish**
Open the content piece → select a connected destination → **Publish**. The piece status updates to **published** with a link to the live post when available.

**Autopilot**
When social accounts are connected, Autopilot can generate matching social variants for blog content. Review before publishing if your settings require approval.`,
  },
  {
    slug: "social-publishing-troubleshooting",
    title: "Social publishing troubleshooting",
    description: "Fix token expiry, permission errors, and failed health checks.",
    category: "Social publishing",
    audience: "user",
    body: `**Connection health check fails**
1. Project → **Publishing** → **Test connections**
2. Read the error on the platform card
3. Click **Reconnect** (Meta, Bluesky) or disconnect and connect again

**"Platform not connected" when publishing**
The destination must be connected on the **same project** as the content piece. Open Publishing and verify the green Connected badge.

**LinkedIn / X token expired**
Disconnect and reconnect. goals.ac refreshes tokens automatically when refresh tokens are available.

**Meta / Facebook errors**
- Confirm you selected a **Page**, not a personal profile
- Reconnect Meta if the health check shows HTTP 400/401
- Instagram requires a Business account linked to the Page

**Bluesky OAuth errors**
- Verify your handle includes the domain (e.g. \`you.bsky.social\`)
- Self-hosted: confirm \`NEXTAUTH_URL\` matches your public URL and client metadata is reachable

**Mastodon OAuth errors**
- Try the full instance URL (\`https://mastodon.social\`)
- Some instances block dynamic app registration — see admin guide

**Publish returns 502**
The platform API rejected the post. Common causes: content too long, missing media (Instagram), or revoked permissions. Check the error toast message.`,
  },
  {
    slug: "admin-linkedin-developer-app",
    title: "Set up a LinkedIn Developer app",
    description: "Create LinkedIn OAuth credentials for self-hosted goals.ac.",
    category: "Self-hosted admin",
    audience: "admin",
    body: `**1. Create an app**
Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/) → **Create app**. Associate it with a Company Page if required.

**2. OAuth settings**
Add redirect URL:
\`{NEXTAUTH_URL}/api/auth/linkedin/callback\`

Example: \`https://app.goals.ac/api/auth/linkedin/callback\`

**3. Products / scopes**
Enable **Share on LinkedIn** and **Sign In with LinkedIn**. Required scopes used by goals.ac:
- \`openid\`
- \`profile\`
- \`w_member_social\`
- \`email\`

**4. Credentials (pick one)**

**A. Platform Admin (recommended)**  
\`/admin/integrations\` → **Social** → **LinkedIn** → paste Client ID + Secret → Save.  
Keep social publishing enabled.

**B. Environment variables**
\`\`\`
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=https://app.goals.ac
\`\`\`
If env vars are set, they override admin values and the admin dialog is read-only.

Restart the Next.js app after updating \`.env\`. Admin-saved credentials apply without a restart.`,
  },
  {
    slug: "admin-x-developer-app",
    title: "Set up an X (Twitter) Developer app",
    description: "Configure X OAuth 2 PKCE for self-hosted goals.ac.",
    category: "Self-hosted admin",
    audience: "admin",
    body: `**1. Developer portal**
Create a project and app at [developer.x.com](https://developer.x.com).

**2. OAuth 2.0**
- Type: **Web App** (confidential client)
- Callback URL: \`{NEXTAUTH_URL}/api/auth/twitter/callback\`
- Enable **OAuth 2.0** with PKCE

**3. Scopes**
- \`tweet.read\`
- \`tweet.write\`
- \`users.read\`
- \`offline.access\`

**4. Access level**
Posting requires elevated access on X's API. Apply for the appropriate tier in the developer portal.

**5. Environment variables**
\`\`\`
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=https://app.goals.ac
\`\`\``,
  },
  {
    slug: "admin-meta-developer-app",
    title: "Set up a Meta Developer app",
    description: "Facebook Login, Page permissions, and Instagram Business linking.",
    category: "Self-hosted admin",
    audience: "admin",
    body: `**1. Create a Meta app**
At [developers.facebook.com](https://developers.facebook.com), create an app (type: **Business**).

**2. Add Facebook Login**
- Valid OAuth redirect: \`{NEXTAUTH_URL}/api/auth/meta/callback\`

**3. Permissions**
Request/advanced access as needed:
- \`pages_show_list\`
- \`pages_manage_posts\`
- \`instagram_content_publish\`
- \`business_management\`

**4. Instagram**
Users must link Instagram Business/Creator to their Facebook Page. This is configured in Meta Business Suite, not in goals.ac.

**5. Environment variables**
\`\`\`
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
NEXTAUTH_URL=https://app.goals.ac
\`\`\`

goals.ac exchanges short-lived tokens for long-lived tokens on connect.`,
  },
  {
    slug: "admin-bluesky-oauth-client",
    title: "Bluesky OAuth client metadata",
    description: "Host AT Protocol client metadata and signing keys for Bluesky OAuth.",
    category: "Self-hosted admin",
    audience: "admin",
    body: `Bluesky OAuth requires public **client metadata** and **JWKS** URLs served from your deployment.

**Automatic routes (goals.ac)**
When \`NEXTAUTH_URL\` is set, goals.ac serves:
- \`{NEXTAUTH_URL}/oauth/bluesky-client-metadata.json\`
- \`{NEXTAUTH_URL}/oauth/bluesky-jwks.json\`

**Signing key (production)**
Generate an RSA key and set:
\`\`\`
BLUESKY_OAUTH_PRIVATE_KEY_JWK={"kty":"RSA",...}
BLUESKY_CLIENT_NAME=goals.ac

Or paste the JWK in \`/admin/integrations\` → **Social** → **Bluesky** (env wins if both are set).
NEXTAUTH_URL=https://app.goals.ac
\`\`\`

Without a private JWK (env or Admin Integrations → Bluesky), OAuth client init fails — there is no temporary key fallback.

**Redirect URI**
\`{NEXTAUTH_URL}/api/auth/bluesky/callback\`

**Local development**
Use a tunnel (ngrok, Cloudflare Tunnel) so Bluesky can reach your metadata URLs, or test OAuth only on a deployed staging environment.`,
  },
  {
    slug: "admin-mastodon-oauth",
    title: "Mastodon OAuth and app registration",
    description: "How dynamic registration works and manual fallback for restricted instances.",
    category: "Self-hosted admin",
    audience: "admin",
    body: `**Default flow (dynamic registration)**
When a user connects, goals.ac POSTs to \`{instance}/api/v1/apps\` to register an OAuth client, then redirects to \`{instance}/oauth/authorize\`.

Redirect URI used:
\`{NEXTAUTH_URL}/api/auth/mastodon/callback\`

**No global env vars required**
Mastodon credentials are stored per project after authorization.

**Restricted instances**
If an instance disables open registration:
1. Manually create an app in the instance's **Preferences → Development**
2. Set redirect URI to match goals.ac callback
3. Scopes: \`read write:statuses\`

Manual client_id/secret fallback in the product UI is planned; today users should use instances that allow dynamic registration (most public instances do).

**Mastodon 4.3+**
App registration persistence improved in recent versions. Older instances may require a client-credentials token after registration to prevent app cleanup.`,
  },
  {
    slug: "admin-social-env-vars",
    title: "Social OAuth environment variables",
    description: "Consolidated reference for all social publishing env vars.",
    category: "Self-hosted admin",
    audience: "admin",
    cta: { label: "View .env.example", href: "https://github.com/goals-ac/goals.ac" },
    body: `**Required for canonical URL / callbacks**
\`\`\`
NEXTAUTH_URL=https://app.goals.ac
AUTH_SECRET=random-32-char-string
\`\`\`

**LinkedIn**
\`\`\`
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
\`\`\`

**X (Twitter)**
\`\`\`
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
\`\`\`

**Meta (Facebook + Instagram)**
\`\`\`
META_APP_ID=
META_APP_SECRET=
\`\`\`

**Bluesky**
\`\`\`
BLUESKY_CLIENT_NAME=goals.ac
BLUESKY_OAUTH_PRIVATE_KEY_JWK=
\`\`\`

**Mastodon**
No platform-level env vars — per-instance OAuth is registered at connect time.

**Encryption**
CMS and social tokens are encrypted with:
\`\`\`
GEMINI_KEY_ENCRYPTION_SECRET=
\`\`\`
Changing this secret invalidates all stored credentials.

See individual platform admin guides for redirect URI paths and portal setup details.`,
  },
];

export const HELP_CATEGORIES: HelpCategory[] = [
  "Getting started",
  "Social publishing",
  "Self-hosted admin",
];

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function getHelpArticlesByCategory(category: HelpCategory): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === category);
}
