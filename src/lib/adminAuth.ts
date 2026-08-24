export const ADMIN_COOKIE_NAME = "crcl_admin_session";

export function getAdminUsername() {
  return process.env.CRCL_ADMIN_USERNAME || "admin";
}

export function getAdminPassword() {
  return process.env.CRCL_ADMIN_PASSWORD || "CrclAdmin2026#!";
}

function getSecret() {
  return process.env.CRCL_ADMIN_AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "crcl-admin-local-secret";
}

function bytesToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createAdminSessionToken() {
  const input = getAdminUsername() + ":" + getAdminPassword() + ":" + getSecret();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return bytesToHex(digest);
}

export async function isValidAdminSessionToken(token?: string | null) {
  if (!token) return false;
  return token === await createAdminSessionToken();
}

export async function isValidAdminRequest(request: { cookies: { get(name: string): { value?: string } | undefined } }) {
  return isValidAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}
