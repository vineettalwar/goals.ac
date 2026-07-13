import { publishToBeehiiv } from "@workspace/connectors/beehiiv";
import { publishToConvertKit } from "@workspace/connectors/convertkit";
import { publishToMailchimp } from "@workspace/connectors/mailchimp";
import type { CmsIntegrationCredentials, EspPublishPlatform } from "./cms-integrations";
import type { PublishableContentPiece } from "./cms-publish";

export interface EspPublishResult {
  publishedUrl: string;
  publishPlatform: EspPublishPlatform;
}

export async function publishPieceToEsp(
  platform: EspPublishPlatform,
  piece: PublishableContentPiece,
  creds: CmsIntegrationCredentials,
): Promise<EspPublishResult> {
  switch (platform) {
    case "beehiiv": {
      if (!creds.beehiiv) {
        throw new Error("Beehiiv is not connected. Configure it in Project Settings → Publishing.");
      }
      const result = await publishToBeehiiv(creds.beehiiv, piece.title, piece.bodyMarkdown);
      return { publishedUrl: result.url, publishPlatform: "beehiiv" };
    }
    case "convertkit": {
      if (!creds.convertkit) {
        throw new Error("ConvertKit is not connected. Configure it in Project Settings → Publishing.");
      }
      const result = await publishToConvertKit(creds.convertkit, piece.title, piece.bodyMarkdown);
      return { publishedUrl: result.url, publishPlatform: "convertkit" };
    }
    case "mailchimp": {
      if (!creds.mailchimp) {
        throw new Error("Mailchimp is not connected. Configure it in Project Settings → Publishing.");
      }
      const result = await publishToMailchimp(creds.mailchimp, piece.title, piece.bodyMarkdown);
      return { publishedUrl: result.url, publishPlatform: "mailchimp" };
    }
    default: {
      const exhaustive: never = platform;
      throw new Error(`Unsupported ESP platform: ${exhaustive}`);
    }
  }
}
