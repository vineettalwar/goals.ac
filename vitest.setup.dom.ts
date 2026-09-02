import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * `test.globals` is off for this workspace (539 existing tests rely on explicit
 * imports, and flipping it on to get testing-library's implicit auto-cleanup would
 * touch all of them for one component suite's benefit). Registering cleanup here
 * instead: without it, a render from one test stays mounted into the next, and
 * `screen` queries silently return elements from the wrong test's tree rather than
 * failing — exactly what happened before this was added.
 */
afterEach(() => {
  cleanup();
});
