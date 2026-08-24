import { NextRequest, NextResponse } from "next/server";

const VALID_ACTIONS = new Set(["approve", "deny"]);

export async function PATCH(request: NextRequest) {
  const { withdrawalId, action } = await request.json().catch(() => ({}));

  if (!withdrawalId || !action) {
    return NextResponse.json({ error: "Missing withdrawalId or action" }, { status: 400 });
  }

  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unknown withdrawal action" }, { status: 400 });
  }

  const baseUrl = process.env.BUILDRBRAND_API_URL || process.env.NEXT_PUBLIC_BUILDRBRAND_API_URL;
  const apiKey = process.env.BUILDRBRAND_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;
  const tenant =
    process.env.BUILDRBRAND_TENANT_SLUG ||
    process.env.NEXT_PUBLIC_BUILDRBRAND_TENANT_SLUG ||
    "crcl";
  const tenantId =
    process.env.BUILDRBRAND_TENANT_ID ||
    process.env.NEXT_PUBLIC_BUILDRBRAND_TENANT_ID ||
    "";

  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { error: "Missing BUILDRBRAND_API_URL or BUILDRBRAND_INTERNAL_API_KEY" },
      { status: 500 }
    );
  }

  const response = await fetch(new URL("/api/internal/ledger/withdrawals", baseUrl), {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-internal-api-key": apiKey,
      "x-tenant": tenant,
      "x-tenant-slug": tenant,
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    },
    body: JSON.stringify({ withdrawalId, action }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error || "Buildrbrand withdrawal action failed" },
      { status: response.status }
    );
  }

  return NextResponse.json(payload ?? { ok: true });
}
