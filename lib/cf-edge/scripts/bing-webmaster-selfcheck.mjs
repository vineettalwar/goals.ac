function bingSiteRows(data) {
  if (!data || typeof data !== "object") return [];
  const envelope = data.d;
  if (Array.isArray(envelope)) return envelope;
  if (envelope && typeof envelope === "object" && Array.isArray(envelope.results)) {
    return envelope.results;
  }
  return [];
}

function parseBingUserSites(data) {
  return bingSiteRows(data)
    .filter((site) => site.IsVerified !== false)
    .map((site) => site.Url)
    .filter(Boolean);
}

function normalizeHttpUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeHost(url) {
  try {
    return new URL(normalizeHttpUrl(url)).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]?.toLowerCase() ?? url;
  }
}

function propertyHost(propertyUrl) {
  if (propertyUrl.startsWith("sc-domain:")) {
    return propertyUrl.slice("sc-domain:".length).replace(/^www\./i, "").toLowerCase();
  }
  return normalizeHost(propertyUrl);
}

function propertyMatchesProject(projectUrl, propertyUrl) {
  const projectHost = normalizeHost(projectUrl);
  const host = propertyHost(propertyUrl);
  if (!projectHost || !host) return false;
  return projectHost === host || projectHost.endsWith(`.${host}`) || host.endsWith(`.${projectHost}`);
}

function pickSearchProperty(projectUrl, properties) {
  const unique = [...new Set(properties)];
  const matched = unique.find((property) => propertyMatchesProject(projectUrl, property));
  if (matched) return matched;
  return unique.length === 1 ? unique[0] : null;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const verified = parseBingUserSites({
  d: [
    { Url: "https://keep.example/", IsVerified: true },
    { Url: "https://drop.example/", IsVerified: false },
    { Url: "https://legacy.example/" },
  ],
});

assert(verified.includes("https://keep.example/"), "verified site kept");
assert(!verified.includes("https://drop.example/"), "unverified site dropped");
assert(verified.includes("https://legacy.example/"), "missing IsVerified kept");
assert(parseBingUserSites(null).length === 0, "null payload is empty");
assert(parseBingUserSites({}).length === 0, "empty object is empty");

const odata = parseBingUserSites({
  d: { results: [{ Url: "http://vineet.de/", IsVerified: true }] },
});
assert(odata.includes("http://vineet.de/"), "odata results envelope parsed");

assert(
  pickSearchProperty("https://www.vineet.de", ["http://vineet.de/"]) === "http://vineet.de/",
  "www vs apex http match",
);
assert(
  pickSearchProperty("https://blog.vineet.de", ["http://vineet.de/"]) === "http://vineet.de/",
  "subdomain matches apex bing site",
);
assert(
  pickSearchProperty("https://vineet.de", ["http://other.example/", "http://vineet.de/"]) ===
    "http://vineet.de/",
  "picks matching host among many",
);
assert(
  pickSearchProperty("https://vineet.de", ["http://only.example/"]) === "http://only.example/",
  "sole verified site is used",
);
assert(
  pickSearchProperty("https://vineet.de", ["http://a.example/", "http://b.example/"]) === null,
  "ambiguous sites stay unpicked",
);

console.log("bing-webmaster-selfcheck: ok");
