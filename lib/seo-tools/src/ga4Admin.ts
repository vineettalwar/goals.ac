export type Ga4Property = {
  propertyId: string;
  displayName: string;
  accountDisplayName: string;
  defaultUri: string | null;
};

type AccountSummariesResponse = {
  accountSummaries?: Array<{
    displayName?: string;
    propertySummaries?: Array<{
      property?: string;
      displayName?: string;
    }>;
  }>;
  nextPageToken?: string;
};

type DataStreamsResponse = {
  dataStreams?: Array<{
    name?: string;
    type?: string;
    webStreamData?: {
      defaultUri?: string;
    };
  }>;
  nextPageToken?: string;
};

function normalizeHost(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      ?.toLowerCase() ?? url.toLowerCase();
  }
}

async function fetchWebDefaultUri(accessToken: string, propertyId: string): Promise<string | null> {
  const numericId = propertyId.replace(/^properties\//, "");
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams();
    if (pageToken) params.set("pageToken", pageToken);
    const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${numericId}/dataStreams?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as DataStreamsResponse;
    for (const stream of data.dataStreams ?? []) {
      if (stream.type === "WEB_DATA_STREAM" && stream.webStreamData?.defaultUri) {
        return stream.webStreamData.defaultUri;
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return null;
}

export async function listGa4Properties(accessToken: string): Promise<Ga4Property[]> {
  const properties: Ga4Property[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: "200" });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://analyticsadmin.googleapis.com/v1beta/accountSummaries?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return properties;

    const data = (await res.json()) as AccountSummariesResponse;
    for (const account of data.accountSummaries ?? []) {
      const accountDisplayName = account.displayName ?? "Google Analytics account";
      for (const summary of account.propertySummaries ?? []) {
        if (!summary.property) continue;
        const defaultUri = await fetchWebDefaultUri(accessToken, summary.property);
        properties.push({
          propertyId: summary.property,
          displayName: summary.displayName ?? summary.property,
          accountDisplayName,
          defaultUri,
        });
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return properties;
}

export function propertyMatchesProject(projectUrl: string, property: Ga4Property): boolean {
  const projectHost = normalizeHost(projectUrl);
  if (property.defaultUri) {
    return normalizeHost(property.defaultUri) === projectHost;
  }
  return false;
}

export function rankGa4Properties(projectUrl: string, properties: Ga4Property[]) {
  const seen = new Set<string>();
  const unique = properties.filter((property) => {
    if (seen.has(property.propertyId)) return false;
    seen.add(property.propertyId);
    return true;
  });

  return unique
    .map((property) => ({
      ...property,
      recommended: propertyMatchesProject(projectUrl, property),
    }))
    .sort((a, b) => {
      if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
}
