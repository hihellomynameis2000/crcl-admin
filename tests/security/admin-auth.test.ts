import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createAdminSessionToken,
  getAdminAuthConfig,
  isValidAdminSessionToken,
  verifyAdminCredentials,
} from "../../src/lib/adminAuth.ts";

const original = {
  username: process.env.CRCL_ADMIN_USERNAME,
  password: process.env.CRCL_ADMIN_PASSWORD,
  secret: process.env.CRCL_ADMIN_AUTH_SECRET,
};

function restoreEnvironment() {
  if (original.username === undefined) delete process.env.CRCL_ADMIN_USERNAME;
  else process.env.CRCL_ADMIN_USERNAME = original.username;
  if (original.password === undefined) delete process.env.CRCL_ADMIN_PASSWORD;
  else process.env.CRCL_ADMIN_PASSWORD = original.password;
  if (original.secret === undefined) delete process.env.CRCL_ADMIN_AUTH_SECRET;
  else process.env.CRCL_ADMIN_AUTH_SECRET = original.secret;
}

test.afterEach(restoreEnvironment);

test("admin authentication fails closed without strong runtime secrets", async () => {
  delete process.env.CRCL_ADMIN_USERNAME;
  delete process.env.CRCL_ADMIN_PASSWORD;
  delete process.env.CRCL_ADMIN_AUTH_SECRET;
  assert.equal(getAdminAuthConfig(), null);
  assert.equal(await verifyAdminCredentials("admin", "admin"), false);

  process.env.CRCL_ADMIN_USERNAME = "admin";
  process.env.CRCL_ADMIN_PASSWORD = "too-short";
  process.env.CRCL_ADMIN_AUTH_SECRET = "too-short";
  assert.equal(getAdminAuthConfig(), null);
});

test("signed admin sessions validate and reject tampering", async () => {
  process.env.CRCL_ADMIN_USERNAME = "crcl-security-admin";
  process.env.CRCL_ADMIN_PASSWORD = "a-strong-password-value";
  process.env.CRCL_ADMIN_AUTH_SECRET = "a-strong-auth-secret-value-that-is-long-enough";

  assert.equal(await verifyAdminCredentials("crcl-security-admin", "a-strong-password-value"), true);
  assert.equal(await verifyAdminCredentials("crcl-security-admin", "wrong-password"), false);

  const token = await createAdminSessionToken();
  assert.equal(await isValidAdminSessionToken(token), true);
  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.equal(await isValidAdminSessionToken(tampered), false);
});

test("admin login rejects cross-site requests and forwarded-IP prefix spoofing", () => {
  const route = readFileSync(
    new URL("../../app/api/admin/login/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(route, /fetchSite === "cross-site"/);
  assert.match(route, /new URL\(origin\)\.host !== request\.nextUrl\.host/);
  assert.match(route, /chain\?\.at\(-1\)/);
});

test("admin store deletion uses the same atomic database operation as creator deletion", () => {
  const route = readFileSync(
    new URL("../../app/api/admin/shop/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(route, /delete_creator_store_atomic/);
  assert.doesNotMatch(route, /archivedProductIds/);
});
