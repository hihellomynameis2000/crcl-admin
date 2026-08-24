import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminSessionToken, getAdminPassword, getAdminUsername } from "../../../../src/lib/adminAuth";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json().catch(() => ({ username: "", password: "" }));
  if (username !== getAdminUsername() || password !== getAdminPassword()) {
    return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: await createAdminSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
