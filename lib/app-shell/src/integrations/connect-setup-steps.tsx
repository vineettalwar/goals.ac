/** Compact numbered setup checklist shared by CMS / ESP / social connect UIs. */
export function ConnectSetupSteps({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;
  return (
    <ol className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
      {steps.map((step, index) => (
        <li key={step}>
          <span className="font-medium text-foreground">{index + 1}. </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

/** Platform-specific checklists for long-tail CMS (full-app connect dialog). */
export const FULL_APP_CMS_SETUP_STEPS: Record<string, string[]> = {
  contentful: [
    "Create a Content Management API token in Contentful (Settings → API keys).",
    "Paste Space ID, Environment (usually master), Content type ID, and title/body/slug field IDs.",
    "Save in Integrations, then Run health check before the first publish.",
  ],
  sanity: [
    "Create a Sanity API token with write access for your project.",
    "Paste Project ID, Dataset (usually production), Document type, and title/body/slug fields.",
    "Save in Integrations, then Run health check before the first publish.",
  ],
  strapi: [
    "Create an API token in Strapi Admin → Settings → API Tokens.",
    "Paste your Strapi base URL, token, and content type (e.g. articles).",
    "Save in Integrations, then Run health check before the first publish.",
  ],
  typo3: [
    "Install the goals.ac TYPO3 extension and open Extension Manager settings.",
    "Paste your TYPO3 site URL and the plugin site key.",
    "Save in Integrations, then Run health check before the first publish.",
  ],
  wix: [
    "Create a Wix API access token with Blog permissions for your site.",
    "Paste the access token and Site ID from the Wix dashboard.",
    "Save in Integrations, then Run health check before the first publish.",
  ],
  framer: [
    "Generate a Framer CMS API token for your project.",
    "Paste the token, Collection ID, and title/body field slugs.",
    "Save in Integrations, then Run health check before the first publish.",
  ],
  squarespace: [
    "Create a Squarespace Developer API key with blog access.",
    "Paste the API key and Blog ID from your site settings.",
    "Save in Integrations, then Run health check before the first publish.",
  ],
  hubspot: [
    "Create a HubSpot private app with CMS/blog content scopes.",
    "Paste the private app token and Blog ID.",
    "Save in Integrations, then Run health check before the first publish.",
  ],
};

export function getFullAppCmsSetupSteps(
  platformKey: string | undefined,
  platformLabel: string,
): string[] {
  if (platformKey && FULL_APP_CMS_SETUP_STEPS[platformKey]) {
    return FULL_APP_CMS_SETUP_STEPS[platformKey];
  }
  return [
    `Open Integrations and choose ${platformLabel} (or the matching CMS tile).`,
    "Paste API credentials from that platform’s developer or site settings.",
    "Save and Run health check before the first publish.",
  ];
}

export const WEBHOOK_SETUP_STEPS = [
  "Paste your HTTPS webhook URL (the endpoint that receives publish events).",
  "Choose payload format / which events to send (JSON body and signing secret).",
  "Save, then Run health check to confirm the endpoint responds.",
];

export function getSocialSetupSteps(destinationId: string): string[] {
  switch (destinationId) {
    case "meta":
      return [
        "Connect with Meta OAuth (Facebook login).",
        "Pick the Facebook Page and linked Instagram account.",
        "Confirm Connected, then Run health check if available.",
      ];
    case "bluesky":
      return [
        "Enter your Bluesky handle (e.g. you.bsky.social).",
        "Authorize via AT Protocol OAuth.",
        "Confirm the account shows as Connected.",
      ];
    case "mastodon":
      return [
        "Enter your Mastodon instance URL.",
        "Authorize via OAuth on that instance.",
        "Confirm the account shows as Connected.",
      ];
    case "linkedin":
      return [
        "Connect with LinkedIn OAuth.",
        "Approve publishing permissions for your account.",
        "Confirm Connected on this tile.",
      ];
    case "twitter":
      return [
        "Connect with X (Twitter) OAuth.",
        "Approve posting permissions for your account.",
        "Confirm Connected on this tile.",
      ];
    default:
      return [
        "Start OAuth for this network.",
        "Approve access when prompted.",
        "Confirm Connected on this tile.",
      ];
  }
}
