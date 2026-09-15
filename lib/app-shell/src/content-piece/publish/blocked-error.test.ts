import { describe, expect, it } from "vitest";
import { isPublishBlockedError, publishBlockedErrorFromBody } from "./blocked-error";

describe("publishBlockedErrorFromBody", () => {
  it("builds an error from the publish 422 payload", () => {
    const err = publishBlockedErrorFromBody({
      error: "Content not ready to publish",
      blockers: [
        { code: "em_dash", message: "Em dashes in the body.", detail: "line 12" },
        { message: "Meta description is missing." },
      ],
    });

    expect(err?.message).toBe("Content not ready to publish");
    expect(err?.blockers).toEqual([
      { message: "Em dashes in the body.", detail: "line 12" },
      { message: "Meta description is missing." },
    ]);
  });

  it("returns null when blockers are missing", () => {
    expect(publishBlockedErrorFromBody({ error: "Confirm WordPress update" })).toBeNull();
  });

  it("recognizes a same-shape error from another module copy", () => {
    const err = Object.assign(new Error("Content not ready to publish"), {
      name: "PublishBlockedError",
      blockers: [{ message: "Em dashes in the body." }],
    });
    expect(isPublishBlockedError(err)).toBe(true);
  });
});
