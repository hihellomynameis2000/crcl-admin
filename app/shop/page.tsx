import AdminButton from "../../src/components/admin/AdminButton";
import KpiCard from "../../src/components/admin/KpiCard";
import PageTitle from "../../src/components/admin/PageTitle";
import ShopCardActions from "../../src/components/admin/ShopCardActions";
import {
  ManualShopSetupForm,
  NewProductForm,
  ProductQuickEditForm,
  ShopSettingsForm,
} from "../../src/components/admin/ShopAdminForms";
import {
  compact,
  currency,
  dollarsFromTokens,
  getShopControlCenter,
  shopSourceLabel,
  type ShopAdminProduct,
  type ShopAdminSummary,
} from "../../src/lib/adminData";

export const dynamic = "force-dynamic";

function dateLabel(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "No timestamp";
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";
}

function StatusPill({ shop }: { shop: ShopAdminSummary }) {
  const label =
    shop.status === "active"
      ? "Live shop"
      : shop.status === "needs_products"
        ? "Needs products"
        : shop.status === "deleted"
          ? "Deleted shop"
        : "No active products";
  const tone =
    shop.status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100"
      : shop.status === "needs_products"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100"
        : shop.status === "deleted"
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200"
        : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/12 dark:bg-white/8 dark:text-white/70";

  return <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${tone}`}>{label}</span>;
}

function AssetPreview({ src, label, fallback }: { src?: string | null; label: string; fallback: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1c1c1a] via-[#2b2b27] to-[#070707] text-sm font-extrabold text-white/55">
      {fallback}
    </div>
  );
}

function ProductImage({ product }: { product: ShopAdminProduct }) {
  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#deded8] bg-[#f7f7f4] dark:border-white/10 dark:bg-white/[0.04]">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-extrabold uppercase tracking-[0.14em] text-black/30 dark:text-white/30">
          No image
        </div>
      )}
    </div>
  );
}

function ProductRow({ product }: { product: ShopAdminProduct }) {
  const archived = !product.active || Boolean(product.archivedAt);
  const inventory =
    product.inventoryPolicy === "continue"
      ? product.inventoryQuantity === null
        ? "Unlimited"
        : `${compact(product.inventoryQuantity)} · oversell on`
      : product.inventoryQuantity === null
        ? "Not tracked"
        : compact(product.inventoryQuantity);

  return (
    <div className="rounded-2xl border border-[#deded8] bg-white p-4 dark:border-white/10 dark:bg-white/[0.035]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex min-w-0 gap-4">
          <ProductImage product={product} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-base font-extrabold text-[#171714] dark:text-white">{product.title}</h4>
              <span className="rounded-full border border-[#deded8] px-2 py-0.5 text-[11px] font-extrabold text-black/55 dark:border-white/10 dark:text-white/55">
                {shopSourceLabel(product.sourceType)}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${
                  archived
                    ? "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-white/8 dark:text-white/55"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100"
                }`}
              >
                {archived ? "Archived" : "Active"}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-black/52 dark:text-white/52">
              {product.description || "No description set."}
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/35 dark:text-white/35">Price</div>
                <div className="font-extrabold text-[#171714] dark:text-white">
                  {compact(product.priceTokens)} tokens
                  <span className="ml-1 font-semibold text-black/40 dark:text-white/40">≈ {currency(dollarsFromTokens(product.priceTokens))}</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/35 dark:text-white/35">Inventory</div>
                <div className="font-extrabold text-[#171714] dark:text-white">{inventory}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-black/35 dark:text-white/35">Updated</div>
                <div className="font-extrabold text-[#171714] dark:text-white">{dateLabel(product.updatedAt ?? product.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <AdminButton
            label={archived ? "Restore" : "Archive"}
            endpoint="/api/admin/shop"
            method="PATCH"
            body={{ action: "product", productId: product.id, mode: archived ? "restore" : "archive" }}
            tone={archived ? "default" : "danger"}
            confirmText={archived ? "Restore this product?" : "Archive this product?"}
          />
        </div>
      </div>
      <div className="mt-4">
        <ProductQuickEditForm product={product} />
      </div>
    </div>
  );
}

function ShopCard({ shop }: { shop: ShopAdminSummary }) {
  const publicAppUrl = (process.env.NEXT_PUBLIC_CRCL_APP_URL || "https://joinmycrcl.com").replace(/\/$/, "");
  const storeUrl = `${publicAppUrl}/shop/${encodeURIComponent(shop.creatorId)}`;
  const bannerStyle = shop.bannerUrl
    ? { backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.28)), url(${shop.bannerUrl})` }
    : { backgroundImage: "linear-gradient(135deg, #11110f 0%, #2a2a25 46%, #050505 100%)" };

  return (
    <section className="admin-panel overflow-hidden rounded-3xl">
      <div className="relative min-h-[220px] bg-cover bg-center p-6 sm:p-7" style={bannerStyle}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,.18),transparent_32%)]" />
        <div className="relative z-10 flex flex-col justify-between gap-8 sm:min-h-[160px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/25 bg-black/35 shadow-lg">
                <AssetPreview src={shop.logoUrl ?? shop.avatarUrl} label={`${shop.shopName} logo`} fallback={initials(shop.shopName)} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">Shop owner</div>
                <h2 className="mt-1 truncate text-3xl font-black tracking-tight text-white">{shop.shopName}</h2>
                <div className="mt-1 text-sm font-bold text-white/65">
                  @{shop.handle} · {shop.ownerName}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill shop={shop} />
              {shop.storeExists ? (
                <ShopCardActions creatorId={shop.creatorId} shopName={shop.shopName} storeUrl={storeUrl} featured={shop.featured} />
              ) : null}
            </div>
          </div>
          <p className="max-w-3xl text-sm font-semibold leading-6 text-white/72">{shop.description}</p>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MiniMetric label="Source" value={shopSourceLabel(shop.sourceType)} />
          <MiniMetric label="Products" value={`${shop.activeProductCount} active / ${shop.productCount} total`} />
          <MiniMetric label="Out of stock" value={compact(shop.outOfStockCount)} />
          <MiniMetric label="Orders" value={`${compact(shop.paidOrderCount)} paid`} />
          <MiniMetric label="Gross" value={`${compact(shop.grossTokens)} tokens`} detail={currency(shop.grossCents)} />
          <MiniMetric label="Updated" value={dateLabel(shop.updatedAt)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#171714] dark:text-white">Product controls</h3>
                <p className="mt-1 text-sm font-medium text-black/48 dark:text-white/48">
                  Edit token pricing, source, inventory policy, images, and active state.
                </p>
              </div>
              <div className="rounded-full border border-[#deded8] px-3 py-1 text-xs font-extrabold text-black/52 dark:border-white/10 dark:text-white/52">
                Creator ID: {shop.creatorId}
              </div>
            </div>

            {shop.products.length ? (
              <div className="space-y-3">
                {shop.products.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#deded8] bg-[#f7f7f4] p-8 text-center dark:border-white/12 dark:bg-white/[0.035]">
                <div className="text-lg font-black text-[#171714] dark:text-white">No products in this shop yet.</div>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/52 dark:text-white/52">
                  Add the first product here so the creator’s storefront can show real catalog inventory.
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <ShopSettingsForm shop={shop} />
            <NewProductForm creatorId={shop.creatorId} />
            <div className="rounded-xl border border-[#deded8] bg-[#f7f7f4] p-4 text-sm font-medium leading-6 text-black/55 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55">
              <div className="font-extrabold text-[#171714] dark:text-white">Admin notes</div>
              <div className="mt-2">
                Banner/logo fields write to shop settings metadata. Product controls write to CRCL’s native product table and reflect on the public shop once the main app reads the same records.
              </div>
              <div className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-black/35 dark:text-white/35">
                {shop.shopDomain ? `Domain / slug: ${shop.shopDomain}` : "No custom shop slug set"}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-[#deded8] bg-[#f7f7f4] p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/35 dark:text-white/35">{label}</div>
      <div className="mt-1 truncate text-sm font-extrabold text-[#171714] dark:text-white">{value}</div>
      {detail ? <div className="mt-0.5 text-xs font-semibold text-black/42 dark:text-white/42">{detail}</div> : null}
    </div>
  );
}

export default async function ShopControlsPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const dashboard = await getShopControlCenter(query);

  return (
    <div>
      <PageTitle
        title="Shop controls"
        subtitle="Enterprise control center for every creator shop on CRCL: monitor storefront health, manually configure shop assets, and manage products without logging into creator accounts."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Shops monitored" value={compact(dashboard.stats.totalShops)} detail={`${compact(dashboard.stats.activeShops)} live shops`} />
        <KpiCard label="Active products" value={compact(dashboard.stats.activeProducts)} detail={`${compact(dashboard.stats.archivedProducts)} archived`} />
        <KpiCard label="Out of stock" value={compact(dashboard.stats.outOfStockProducts)} detail="Inventory policy checked" />
        <KpiCard label="Shop gross" value={currency(dashboard.stats.grossCents)} detail={`${compact(dashboard.stats.grossTokens)} tokens · ${compact(dashboard.stats.paidOrders)} paid orders`} />
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <form className="admin-panel flex items-center gap-3 rounded-2xl p-3">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search shop, creator, email, source, product, or profile ID"
            className="h-11 flex-1 rounded-xl border border-[#deded8] bg-white px-4 text-sm font-semibold outline-none focus:border-black/45 dark:border-white/12 dark:bg-white/[0.05] dark:text-white dark:focus:border-white/40"
          />
          <button className="h-11 rounded-xl bg-[#191917] px-5 text-sm font-extrabold text-white dark:bg-white dark:text-black">Search</button>
        </form>

        <div className="admin-panel rounded-2xl p-5">
          <div className="mb-4">
            <h2 className="text-base font-black text-[#171714] dark:text-white">Manual shop setup</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-black/52 dark:text-white/52">
              Create or override a creator storefront, including the public banner and logo.
            </p>
          </div>
          <ManualShopSetupForm />
        </div>
      </div>

      {dashboard.shops.length ? (
        <div className="space-y-6">
          {dashboard.shops.map((shop) => (
            <ShopCard key={shop.creatorId} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="admin-panel rounded-3xl p-10 text-center">
          <div className="text-xl font-black text-[#171714] dark:text-white">No shops match this search.</div>
          <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-black/52 dark:text-white/52">
            Clear the search or use manual shop setup to attach a storefront to a creator profile ID.
          </p>
        </div>
      )}
    </div>
  );
}
