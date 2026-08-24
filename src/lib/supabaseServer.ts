import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const DEFAULT_PLATFORM_FEE_RATE = Number(process.env.CRCL_PLATFORM_FEE_RATE ?? "0.15");
export const DEFAULT_MERCHANT_FEE_RATE = Number(process.env.CRCL_MERCHANT_FEE_RATE ?? "0");
export const TOKENS_PER_DOLLAR = Number(process.env.CRCL_TOKENS_PER_DOLLAR ?? "100");

type TenantFeeRow = {
  platform_fee_bps: number | null;
  merchant_fee_bps: number | null;
};

export async function getTenantFeeRates() {
  const tenantSlug = process.env.BUILDRBRAND_TENANT_SLUG?.trim() || "crcl";

  const normalizeTenantRates = (data: TenantFeeRow | null | undefined, source: string) => {
    const platformBps = Number(data?.platform_fee_bps ?? 0);
    const merchantBps = Number(data?.merchant_fee_bps ?? 0);

    return {
      platformRate: Number.isFinite(platformBps) && platformBps > 0 ? platformBps / 10000 : DEFAULT_PLATFORM_FEE_RATE,
      merchantRate: Number.isFinite(merchantBps) && merchantBps > 0 ? merchantBps / 10000 : DEFAULT_MERCHANT_FEE_RATE,
      source:
        Number.isFinite(platformBps) && platformBps > 0
          ? source
          : `${source} missing fee; using CRCL_PLATFORM_FEE_RATE`,
    };
  };

  try {
    const { data, error } = await supabaseAdmin()
      .schema("ledger")
      .from("tenants")
      .select("platform_fee_bps, merchant_fee_bps")
      .eq("slug", tenantSlug)
      .maybeSingle<TenantFeeRow>();

    if (!error && data) {
      return normalizeTenantRates(data, `Buildrbrand tenant ${tenantSlug}`);
    }
  } catch {
    // CRCL product tables can run without the Buildrbrand tenant config table present.
  }

  try {
    const { data, error } = await supabaseAdmin()
      .from("tenants")
      .select("platform_fee_bps, merchant_fee_bps")
      .eq("slug", tenantSlug)
      .maybeSingle<TenantFeeRow>();

    if (!error && data) {
      return normalizeTenantRates(data, `Buildrbrand tenant ${tenantSlug}`);
    }
  } catch {
    // Keep the env fallback for deployments where tenant fee config is not present.
  }

  return {
    platformRate: DEFAULT_PLATFORM_FEE_RATE,
    merchantRate: DEFAULT_MERCHANT_FEE_RATE,
    source: "CRCL_PLATFORM_FEE_RATE fallback",
  };
}
