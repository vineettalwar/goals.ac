import { describe, expect, it } from "vitest";
import { joomlaImagesFromFeaturedUrl } from "./joomla";

describe("joomlaImagesFromFeaturedUrl", () => {
  it("maps https URLs into intro + fulltext images fields", () => {
    const images = joomlaImagesFromFeaturedUrl("https://cdn.example/hero.png");
    expect(images).toEqual({
      image_intro: "https://cdn.example/hero.png",
      float_intro: "",
      image_intro_alt: "",
      image_intro_caption: "",
      image_fulltext: "https://cdn.example/hero.png",
      float_fulltext: "",
      image_fulltext_alt: "",
      image_fulltext_caption: "",
    });
  });

  it("skips non-https sources", () => {
    expect(joomlaImagesFromFeaturedUrl("http://cdn.example/a.png")).toBeUndefined();
    expect(joomlaImagesFromFeaturedUrl("data:image/png;base64,abc")).toBeUndefined();
    expect(joomlaImagesFromFeaturedUrl("")).toBeUndefined();
    expect(joomlaImagesFromFeaturedUrl(null)).toBeUndefined();
  });
});
