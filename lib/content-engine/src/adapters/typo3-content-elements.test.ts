import { describe, expect, it } from "vitest";
import {
  markdownToTypo3ContentElements,
  prependTypo3FeaturedBase64,
} from "./typo3-content-elements";

describe("prependTypo3FeaturedBase64", () => {
  it("prepends textmedia with imageBase64 for FAL import", () => {
    const elements = markdownToTypo3ContentElements("## Hello\n\nBody");
    const next = prependTypo3FeaturedBase64(elements, {
      imageBase64: "iVBORw0KGgo=",
      imageMime: "image/png",
      alt: "Hero",
    });

    expect(next[0]).toMatchObject({
      ctype: "textmedia",
      fields: {
        imageBase64: "iVBORw0KGgo=",
        imageMime: "image/png",
        imagealt: "Hero",
        bodytext: "",
      },
    });
    expect(next.length).toBe(elements.length + 1);
    expect(next.slice(1)).toEqual(elements);
  });
});
