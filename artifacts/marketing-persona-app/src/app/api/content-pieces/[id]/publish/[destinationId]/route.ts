import { NextResponse } from "next/server";
import { POST as publishContentPiece } from "../route";

const VALID_DESTINATIONS = new Set([
  "wordpress",
  "notion",
  "webflow",
  "ghost",
  "webhook",
  "shopify",
  "drupal",
  "joomla",
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
  "bluesky",
  "mastodon",
]);

/** Legacy per-destination publish URLs (Express parity for redirect shell). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; destinationId: string }> },
) {
  const { id, destinationId } = await params;

  if (!VALID_DESTINATIONS.has(destinationId)) {
    return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const mergedBody =
    body && typeof body === "object" && !Array.isArray(body)
      ? { ...body, platform: destinationId }
      : { platform: destinationId };

  const mergedReq = new Request(
    req.url.replace(/\/publish\/[^/]+$/, "/publish"),
    {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(mergedBody),
    },
  );

  return publishContentPiece(mergedReq, { params: Promise.resolve({ id }) });
}
