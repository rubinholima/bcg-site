import assert from "node:assert/strict";
import { toPublicClientApiPath } from "./public-client-api";

assert.equal(
  toPublicClientApiPath("/api/public/tenants/foo/fixtures"),
  "/cup360-pub/tenants/foo/fixtures",
);
assert.equal(toPublicClientApiPath("/cup360-pub/lead"), "/cup360-pub/lead");
assert.equal(toPublicClientApiPath("https://x.com/a"), "https://x.com/a");

console.log("public-client-api.spec OK");
