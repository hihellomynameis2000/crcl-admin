import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminAuthConfig,
  isAllowedAdminOrigin,
  verifyAdminCredentials,
} from "../../../../src/lib/adminAuth";
import { supabaseAdmin } from "../../../../src/lib/supabaseServer";

const WINDOW_SECONDS = 15 * 60;

function clientKey(request: NextRequest) {
  const chain = request.headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()).filter(Boolean);
  return chain?.at(-1) || "unknown";
}

function keyHash(scope: string, value: string) {
  return createHash("sha256").update(`${scope}:${value}`).digest("hex");
}

async function consumeAttempt(key: string, limit: number) {
  const { data, error } = await supabaseAdmin().rpc("consume_api_rate_limit", {
    p_key_hash: key,
    p_limit: limit,
    p_window_seconds: WINDOW_SECONDS,
  });
  if (error) throw new Error("Admin login rate limiter is unavailable");
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: row?.allowed === true,
    retryAfter: Math.max(1, Number(row?.retry_after ?? WINDOW_SECONDS)),
  };
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!isAllowedAdminOrigin(origin) || fetchSite === "cross-site") {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!getAdminAuthConfig()) {
    return NextResponse.json(
      { error: "Admin authentication is unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { username, password } = await request.json().catch(() => ({ username: "", password: "" }));
  const normalizedUsername = String(username ?? "").trim().toLowerCase().slice(0, 128);
  const ipKey = keyHash("admin-login-ip", clientKey(request));
  const identityKey = keyHash("admin-login-identity", normalizedUsername || "empty");

  let attempts: Array<{ allowed: boolean; retryAfter: number }>;
  try {
    attempts = await Promise.all([
      consumeAttempt(ipKey, 20),
      consumeAttempt(identityKey, 5),
    ]);
  } catch {
    return NextResponse.json(
      { error: "Admin login is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  const blocked = attempts.find((attempt) => !attempt.allowed);
  if (blocked) {
    return NextResponse.json(
      { error: "Too many login attempts" },
      {
        status: 429,
        headers: { "Cache-Control": "no-store", "Retry-After": String(blocked.retryAfter) },
      }
    );
  }

  if (!(await verifyAdminCredentials(String(username ?? ""), String(password ?? "")))) {
    return NextResponse.json(
      { error: "Invalid admin credentials" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  await supabaseAdmin().from("api_rate_limits").delete().in("key_hash", [ipKey, identityKey]);
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: await createAdminSessionToken(),
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
