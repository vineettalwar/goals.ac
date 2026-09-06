/**
 * Self-check: project switch must not carry create/brief/optimize deep links
 * into another project (e.g. Vineet Talwar keyword on stw studio).
 */
import {
  navigationTargetForActiveProject,
  queryStringForProjectSwitch,
  replaceProjectInPathname,
} from "./routing";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(
  replaceProjectInPathname("/projects/1/content-studio", 2) === "/projects/2/content-studio",
  "replace swaps project id on content-studio",
);
assert(
  replaceProjectInPathname("/projects/1/content-piece/99", 2) === "/projects/2/content-studio",
  "content-piece paths land on studio for the new project",
);
assert(
  navigationTargetForActiveProject("/projects/1/content-studio", 2) ===
    "/projects/2/content-studio",
  "nav target swaps project on content-studio",
);

const createQuery =
  "create=1&format=landing_page_copy&keyword=Vineet+Talwar&title=Vineet+Talwar&angle=Rewrite";
assert(
  queryStringForProjectSwitch(createQuery) === "",
  "create deep-link query is dropped on project switch",
);
assert(
  queryStringForProjectSwitch("tab=brand&create=1&keyword=foo") === "tab=brand",
  "generic tab query is kept; create keys are dropped",
);

console.log("active-project routing.check: ok");
