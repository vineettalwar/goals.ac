import { describe, expect, it } from "vitest";
import { requireBoundProjectAccess } from "./project-access";

describe("requireBoundProjectAccess", () => {
  it("404s when websiteProjectId is null (orphans are not world-readable)", async () => {
    await expect(requireBoundProjectAccess(null, 1)).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Not found",
    });
    await expect(requireBoundProjectAccess(undefined, 1)).resolves.toEqual({
      ok: false,
      status: 404,
      error: "Not found",
    });
  });
});
