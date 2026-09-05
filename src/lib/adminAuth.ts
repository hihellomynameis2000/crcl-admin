export const ADMIN_COOKIE_NAME = "crcl_admin_session";
const DEFAULT_ADMIN_ORIGIN = "https://admin.joinmycrcl.com";
const MIN_ADMIN_PASSWORD_LENGTH = 12;
const MIN_ADMIN_SECRET_LENGTH = 24;

const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AdminAuthConfig = {
  username: string;
  password: string;
  secret: string;
};

export function isAllowedAdminOrigin(origin?: string | null) {
  if (!origin) return true;

  try {
    const configuredOrigin = process.env.CRCL_ADMIN_APP_URL?.trim() || DEFAULT_ADMIN_ORIGIN;
    return new URL(origin).origin === new URL(configuredOrigin).origin;
  } catch {
    return false;
  }
}

export function getAdminAuthConfig(): AdminAuthConfig | null {
  const username = process.env.CRCL_ADMIN_USERNAME?.trim() ?? "";
  const password = process.env.CRCL_ADMIN_PASSWORD ?? "";
  const secret = process.env.CRCL_ADMIN_AUTH_SECRET ?? "";

  if (
    !username ||
    password.length < MIN_ADMIN_PASSWORD_LENGTH ||
    secret.length < MIN_ADMIN_SECRET_LENGTH
  ) {
    return null;
  }

  return { username, password, secret };
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload: string, secret: string) {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importSigningKey(secret),
    new TextEncoder().encode(payload)
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

async function constantTimeEqual(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(left)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

export async function verifyAdminCredentials(username: string, password: string) {
  const config = getAdminAuthConfig();
  if (!config) return false;

  const [usernameMatches, passwordMatches] = await Promise.all([
    constantTimeEqual(username, config.username),
    constantTimeEqual(password, config.password),
  ]);
  return usernameMatches && passwordMatches;
}

export async function createAdminSessionToken() {
  const config = getAdminAuthConfig();
  if (!config) throw new Error("Admin authentication is not configured");

  const now = Math.floor(Date.now() / 1000);
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        subject: config.username,
        issuedAt: now,
        expiresAt: now + SESSION_TTL_SECONDS,
        nonce: crypto.randomUUID(),
      })
    )
  );
  return `${payload}.${await sign(payload, config.secret)}`;
}

export async function isValidAdminSessionToken(token?: string | null) {
  if (!token) return false;
  const config = getAdminAuthConfig();
  if (!config) return false;

  const [payload, signature, ...rest] = token.split(".");
  if (!payload || !signature || rest.length > 0) return false;

  try {
    const payloadBytes = base64UrlToBytes(payload);
    const signatureBytes = base64UrlToBytes(signature);
    if (
      bytesToBase64Url(payloadBytes) !== payload ||
      bytesToBase64Url(signatureBytes) !== signature
    ) {
      return false;
    }
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      await importSigningKey(config.secret),
      signatureBytes,
      new TextEncoder().encode(payload)
    );
    if (!validSignature) return false;

    const parsed = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      version?: number;
      subject?: string;
      issuedAt?: number;
      expiresAt?: number;
    };
    const now = Math.floor(Date.now() / 1000);
    return (
      parsed.version === 1 &&
      parsed.subject === config.username &&
      Number.isFinite(parsed.issuedAt) &&
      Number.isFinite(parsed.expiresAt) &&
      Number(parsed.issuedAt) <= now + 60 &&
      Number(parsed.expiresAt) > now
    );
  } catch {
    return false;
  }
}

export async function isValidAdminRequest(request: { cookies: { get(name: string): { value?: string } | undefined } }) {
  return isValidAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}
