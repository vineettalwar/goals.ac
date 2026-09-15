import { describe, expect, it } from "vitest";
import {
  formatPropertyLabel,
  pickSearchProperty,
  propertyMatchesProject,
} from "./search-property-client";

describe("propertyMatchesProject", () => {
  it("matches a domain property to www and apex project URLs", () => {
    expect(propertyMatchesProject("https://www.technicaltip.com", "sc-domain:technicaltip.com")).toBe(
      true,
    );
    expect(propertyMatchesProject("https://technicaltip.com/blog", "sc-domain:technicaltip.com")).toBe(
      true,
    );
  });

  it("does not treat the project name as a hostname", () => {
    expect(propertyMatchesProject("Technical Tip", "sc-domain:technicaltip.com")).toBe(false);
  });
});

describe("pickSearchProperty", () => {
  it("prefers the domain property when both a prefix and domain match", () => {
    expect(
      pickSearchProperty("https://www.technicaltip.com", [
        "https://www.technicaltip.com/",
        "sc-domain:technicaltip.com",
      ]),
    ).toBe("sc-domain:technicaltip.com");
  });

  it("does not auto-pick an unrelated site just because it is the only one", () => {
    expect(pickSearchProperty("https://technicaltip.com", ["https://other-site.com/"])).toBeNull();
  });
});

describe("formatPropertyLabel", () => {
  it("labels domain properties so they are not mistaken for a brand name", () => {
    expect(formatPropertyLabel("sc-domain:technicaltip.com")).toBe("technicaltip.com (domain)");
  });
});
