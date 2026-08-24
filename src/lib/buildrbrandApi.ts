export async function buildrbrandApi<T>(path: string, init?: RequestInit): Promise<T | null> {
  const baseUrl = process.env.BUILDRBRAND_API_URL || process.env.NEXT_PUBLIC_BUILDRBRAND_API_URL;
  const key = process.env.BUILDRBRAND_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY;
  const tenant =
    process.env.BUILDRBRAND_TENANT_SLUG ||
    process.env.NEXT_PUBLIC_BUILDRBRAND_TENANT_SLUG ||
    "crcl";
  const tenantId =
    process.env.BUILDRBRAND_TENANT_ID ||
    process.env.NEXT_PUBLIC_BUILDRBRAND_TENANT_ID ||
    "";
  if (!baseUrl || !key) return null;
  const url = new URL(path, baseUrl);
  if (!url.searchParams.has("tenantSlug")) url.searchParams.set("tenantSlug", tenant);
  if (tenantId && !url.searchParams.has("tenantId")) url.searchParams.set("tenantId", tenantId);
  const response = await fetch(url, {
    ...init,
    headers: {
      "x-internal-api-key": key,
      "x-tenant": tenant,
      "x-tenant-slug": tenant,
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}
