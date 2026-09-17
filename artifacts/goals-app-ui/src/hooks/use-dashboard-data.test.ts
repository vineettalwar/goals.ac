import assert from "node:assert/strict";
import { dashboardQueryLoading } from "./dashboard-query-loading";

assert.equal(dashboardQueryLoading(false, true, false), false, "disabled query is not loading");
assert.equal(dashboardQueryLoading(true, true, false), true, "first fetch is loading");
assert.equal(dashboardQueryLoading(true, true, true), false, "placeholder/cached data is ready");
assert.equal(dashboardQueryLoading(true, false, false), false, "error/empty settled is not loading");
console.log("dashboardQueryLoading: ok");
