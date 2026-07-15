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

/** Native / first-party CMS connect checklists (dialogs + Next publishing cards). */
export const CMS_CONNECT_STEPS: Record<string, string[]> = {
  wordpress: [
    "Choose Application Password (REST) or goals.ac plugin (HMAC).",
    "Paste site URL plus username/app password, or plugin site key from WP Admin → goals.ac.",
    "Save, then Run health check on Integrations to confirm publish is ready.",
  ],
  ghost: [
    "In Ghost Admin → Settings → Integrations, create a Custom Integration.",
    "Copy the Admin API URL and Admin API Key into the fields below.",
    "Save, then Run health check to verify posting works.",
  ],
  drupal: [
    "Prefer the goals.ac Drupal module (HMAC) for layout-aware publish, or JSON:API with a content type.",
    "Paste site URL plus site key (plugin) or username/password (JSON:API).",
    "Save, then Run health check before publishing.",
  ],
  joomla: [
    "Install the goals.ac Joomla plugin for HMAC publishing, or enable Web Services API tokens.",
    "Paste site URL plus site key (plugin) or API token (Web Services).",
    "Save and Run health check; set category if using the REST API.",
  ],
  notion: [
    "Create a Notion internal integration and copy the secret token.",
    "Share your CMS database with that integration, then paste the database ID.",
    "Save and Run health check — Notion must return the database.",
  ],
  webflow: [
    "In Site Settings → Integrations → API access, generate a site token.",
    "Copy the CMS Collection ID for your blog (and optional body field slug).",
    "Save, then Run health check before first publish.",
  ],
  shopify: [
    "Prefer Admin API: create a custom app with write_content (and write_files if you want Files library staging) and paste the shop domain + token (article HTML + featured image).",
    "Or install the goals.ac plugin and paste the site URL + site key (required for metafield / page section modes; featured image is Admin API only).",
    "For metafields or page sections: paste Liquid from cms-plugins/shopify/theme-snippets/ into the theme (Edit code) — storefront will not render section JSON without it. See docs/cms-plugins/shopify-theme-sections.md.",
    "Save and Run health check; set primary blog destination after connect.",
  ],
};

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
    "Latest version includes POST /goals-ac/v1/media for proper FAL file references (older versions fall back to inline base64).",
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

export const WEBHOOK_SETUP_STEPS = [
  "Paste your HTTPS webhook URL (the endpoint that receives publish events).",
  "Choose payload format / which events to send (JSON body and signing secret).",
  "Save, then Run health check to confirm the endpoint responds.",
];

/** Resolve CMS setup steps for any destination id (native, long-tail, webhook). */
export function getCmsSetupSteps(
  platformKey: string | undefined,
  platformLabel = "this CMS",
): string[] {
  if (platformKey === "webhook") return WEBHOOK_SETUP_STEPS;
  if (platformKey && CMS_CONNECT_STEPS[platformKey]) {
    return CMS_CONNECT_STEPS[platformKey];
  }
  return getFullAppCmsSetupSteps(platformKey, platformLabel);
}

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

/** ESP (email) connect checklists — Beehiiv, ConvertKit, Mailchimp. */
export const ESP_CONNECT_STEPS: Record<string, string[]> = {
  beehiiv: [
    "Create an API key in Beehiiv (Settings → Integrations / API).",
    "Paste the API key and Publication ID into the fields below.",
    "Save, then Run health check on Integrations to confirm publish is ready.",
  ],
  convertkit: [
    "Copy your ConvertKit (Kit) API secret from Settings → Developer.",
    "Paste the API secret and optional Form ID into the fields below.",
    "Save, then Run health check to verify the connection.",
  ],
  mailchimp: [
    "Create a Mailchimp API key (Account → Extras → API keys).",
    "Paste the API key, server prefix (e.g. us1), and Audience list ID.",
    "Save, then Run health check to confirm the list is reachable.",
  ],
};

export function getEspSetupSteps(platformKey: string | undefined): string[] {
  if (platformKey && ESP_CONNECT_STEPS[platformKey]) {
    return ESP_CONNECT_STEPS[platformKey];
  }
  return [
    "Create an API key in your email platform’s developer or account settings.",
    "Paste the key and publication or audience list ID into the fields below.",
    "Save, then Run health check on Integrations to confirm publish is ready.",
  ];
}
