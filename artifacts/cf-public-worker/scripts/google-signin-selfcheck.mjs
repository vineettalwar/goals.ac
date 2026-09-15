import assert from "node:assert/strict";

/** Mirror of cf-public-worker googleSignInAllowed — existing accounts only. */
function googleSignInAllowed(opts) {
  if (opts.byGoogleId) return "ok_google_id";
  if (opts.byEmail) return "ok_email_link";
  return "deny";
}

assert.equal(googleSignInAllowed({ byGoogleId: true, byEmail: false }), "ok_google_id");
assert.equal(googleSignInAllowed({ byGoogleId: false, byEmail: true }), "ok_email_link");
assert.equal(googleSignInAllowed({ byGoogleId: true, byEmail: true }), "ok_google_id");
assert.equal(googleSignInAllowed({ byGoogleId: false, byEmail: false }), "deny");

console.log("google-signin.selfcheck: ok");
