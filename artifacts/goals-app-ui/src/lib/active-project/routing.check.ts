/**
 * Self-check: setProjectId must not re-navigate to the same project path,
 * or /projects/:id/integrations fights the → /cms redirect (white-screen loop).
 */
import {
  navigationTargetForActiveProject,
  replaceProjectInPathname,
} from "./routing";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(
  replaceProjectInPathname("/projects/5/integrations", 5) === "/projects/5/integrations",
  "replace keeps bare integrations path",
);
assert(
  replaceProjectInPathname("/projects/5/integrations/cms", 2) ===
    "/projects/2/integrations/cms",
  "replace swaps project id and keeps tab",
);
assert(
  navigationTargetForActiveProject("/projects/5/integrations", 5) ===
    "/projects/5/integrations",
  "nav target equals bare integrations path (caller must skip navigate)",
);
assert(
  navigationTargetForActiveProject("/projects/5/integrations/cms", 5) ===
    "/projects/5/integrations/cms",
  "nav target equals tabbed path when project unchanged",
);
assert(
  navigationTargetForActiveProject("/dashboard", 5) === null,
  "non-project paths do not force navigation",
);

console.log("active-project routing.check: ok");
