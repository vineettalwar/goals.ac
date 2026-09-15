import assert from "node:assert/strict";
import { createHash } from "node:crypto";

function gravatarUrlForEmail(email, size = 128) {
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
}

function resolveSessionImage(avatarUrl, email) {
  const raw = avatarUrl?.trim();
  if (raw && /^https:\/\//i.test(raw)) return raw;
  if (email?.trim()) return gravatarUrlForEmail(email);
  return undefined;
}

assert.equal(
  resolveSessionImage("https://cdn.example/a.jpg", "a@b.com"),
  "https://cdn.example/a.jpg",
);
assert.equal(resolveSessionImage(null, "User@Example.com"), gravatarUrlForEmail("User@Example.com"));
assert.equal(
  resolveSessionImage("data:image/jpeg;base64,abc", "a@b.com"),
  gravatarUrlForEmail("a@b.com"),
);
assert.equal(resolveSessionImage("", null), undefined);

console.log("avatar.selfcheck: ok");
