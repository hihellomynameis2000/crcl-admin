import { NextRequest, NextResponse } from "next/server";
import { isValidAdminRequest } from "../../../../src/lib/adminAuth";
import { supabaseAdmin } from "../../../../src/lib/supabaseServer";

type AnyRecord = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const next = text(value);
  return next || null;
}

function sourceType(value: unknown) {
  const normalized = text(value).toLowerCase();
  if (normalized === "shopify") return "shopify";
  if (normalized === "pod" || normalized === "print_on_demand" || normalized === "print on demand") return "pod";
  return "native";
}

function positiveInteger(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.trunc(parsed));
}

function inventoryPolicy(value: unknown) {
  return value === "continue" ? "continue" : "deny";
}

function hasOwn(body: AnyRecord, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function imageList(value: unknown) {
  const url = nullableText(value);
  return url ? [url] : [];
}

async function requireAdmin(request: NextRequest) {
  if (await isValidAdminRequest(request)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => ({}))) as AnyRecord;
  const creatorId = text(body.creatorId ?? body.creator_id);
  const title = text(body.title);
  if (!creatorId) return NextResponse.json({ error: "Missing creatorId" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Missing product title" }, { status: 400 });

  const payload = {
    creator_id: creatorId,
    source_type: sourceType(body.sourceType ?? body.source_type),
    title,
    description: text(body.description),
    images: imageList(body.imageUrl ?? body.image_url),
    price_tokens: positiveInteger(body.priceTokens ?? body.price_tokens),
    compare_at_price_tokens: hasOwn(body, "compareAtPriceTokens")
      ? positiveInteger(body.compareAtPriceTokens)
      : null,
    subscriber_price_tokens: hasOwn(body, "subscriberPriceTokens")
      ? positiveInteger(body.subscriberPriceTokens)
      : null,
    inventory_quantity: hasOwn(body, "inventoryQuantity") ? positiveInteger(body.inventoryQuantity) : null,
    inventory_policy: inventoryPolicy(body.inventoryPolicy ?? body.inventory_policy),
    active: body.active !== false,
    metadata: {
      admin_created: true,
      admin_created_at: new Date().toISOString(),
    },
  };

  const { error } = await supabaseAdmin().from("creator_products").insert(payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => ({}))) as AnyRecord;
  const action = text(body.action);
  const client = supabaseAdmin();

  if (action === "settings") {
    const creatorId = text(body.creatorId ?? body.creator_id);
    if (!creatorId) return NextResponse.json({ error: "Missing creatorId" }, { status: 400 });

    const { data: existing } = await client
      .from("creator_store_settings")
      .select("metadata")
      .eq("creator_id", creatorId)
      .maybeSingle();
    const currentMetadata = existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {};
    const metadata = {
      ...currentMetadata,
      shop_name: text(body.shopName ?? body.shop_name),
      source_type: sourceType(body.sourceType ?? body.source_type),
      description: text(body.description),
      logo_url: nullableText(body.logoUrl ?? body.logo_url),
      banner_url: nullableText(body.bannerUrl ?? body.banner_url),
      admin_updated_at: new Date().toISOString(),
    };

    const { error } = await client.from("creator_store_settings").upsert(
      {
        creator_id: creatorId,
        shop_domain: nullableText(body.shopDomain ?? body.shop_domain),
        sync_enabled: Boolean(body.syncEnabled ?? body.sync_enabled),
        metadata,
      },
      { onConflict: "creator_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "product") {
    const productId = text(body.productId ?? body.product_id);
    if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (hasOwn(body, "title")) update.title = text(body.title);
    if (hasOwn(body, "description")) update.description = text(body.description);
    if (hasOwn(body, "sourceType")) update.source_type = sourceType(body.sourceType);
    if (hasOwn(body, "priceTokens")) update.price_tokens = positiveInteger(body.priceTokens);
    if (hasOwn(body, "compareAtPriceTokens")) update.compare_at_price_tokens = positiveInteger(body.compareAtPriceTokens);
    if (hasOwn(body, "subscriberPriceTokens")) update.subscriber_price_tokens = positiveInteger(body.subscriberPriceTokens);
    if (hasOwn(body, "inventoryQuantity")) update.inventory_quantity = positiveInteger(body.inventoryQuantity);
    if (hasOwn(body, "inventoryPolicy")) update.inventory_policy = inventoryPolicy(body.inventoryPolicy);
    if (hasOwn(body, "imageUrl")) update.images = imageList(body.imageUrl);
    if (body.mode === "archive") {
      update.active = false;
      update.archived_at = new Date().toISOString();
    }
    if (body.mode === "restore") {
      update.active = true;
      update.archived_at = null;
    }

    if (!Object.keys(update).length) return NextResponse.json({ error: "No product updates provided" }, { status: 400 });
    const { error } = await client.from("creator_products").update(update).eq("id", productId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown shop action" }, { status: 400 });
}
