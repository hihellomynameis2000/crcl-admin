"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopAdminProduct, ShopAdminSummary } from "../../lib/adminData";

const fieldClass =
  "h-10 w-full rounded-lg border border-[#d7d7d1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-black/45 dark:border-white/12 dark:bg-white/[0.05] dark:text-white dark:focus:border-white/40";
const areaClass =
  "min-h-20 w-full rounded-lg border border-[#d7d7d1] bg-white px-3 py-2 text-sm font-semibold outline-none transition focus:border-black/45 dark:border-white/12 dark:bg-white/[0.05] dark:text-white dark:focus:border-white/40";
const labelClass = "space-y-1.5 text-xs font-bold uppercase tracking-[0.1em] text-black/45 dark:text-white/45";

function valueFrom(form: HTMLFormElement, name: string) {
  const value = new FormData(form).get(name);
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(form: HTMLFormElement, name: string) {
  const value = Number(valueFrom(form, name));
  return Number.isFinite(value) ? value : 0;
}

function checkedValue(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.checked : false;
}

async function submitJson(method: "POST" | "PATCH", body: Record<string, unknown>) {
  const response = await fetch("/api/admin/shop", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || "Shop admin action failed");
}

function SourceSelect({ name = "sourceType", defaultValue = "native" }: { name?: string; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue} className={fieldClass}>
      <option value="native">Native CRCL</option>
      <option value="pod">Print on demand</option>
      <option value="shopify">Shopify / external</option>
    </select>
  );
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      disabled={busy}
      className="inline-flex h-10 items-center justify-center rounded-lg bg-[#191917] px-4 text-sm font-extrabold text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-55 dark:bg-white dark:text-black dark:hover:bg-white/90"
    >
      {busy ? "Saving" : label}
    </button>
  );
}

export function ManualShopSetupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError(null);
    try {
      await submitJson("PATCH", {
        action: "settings",
        creatorId: valueFrom(form, "creatorId"),
        shopName: valueFrom(form, "shopName"),
        sourceType: valueFrom(form, "sourceType"),
        description: valueFrom(form, "description"),
        logoUrl: valueFrom(form, "logoUrl"),
        bannerUrl: valueFrom(form, "bannerUrl"),
        shopDomain: valueFrom(form, "shopDomain"),
        syncEnabled: checkedValue(form, "syncEnabled"),
      });
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shop setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className={labelClass}>
          Creator profile ID
          <input name="creatorId" required placeholder="profiles.id" className={fieldClass} />
        </label>
        <label className={labelClass}>
          Shop name
          <input name="shopName" required placeholder="Creator shop name" className={fieldClass} />
        </label>
        <label className={labelClass}>
          Source
          <SourceSelect />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className={labelClass}>
          Logo URL
          <input name="logoUrl" placeholder="https://..." className={fieldClass} />
        </label>
        <label className={labelClass}>
          Banner URL
          <input name="bannerUrl" placeholder="https://..." className={fieldClass} />
        </label>
        <label className={labelClass}>
          Shop domain / slug
          <input name="shopDomain" placeholder="brand-name" className={fieldClass} />
        </label>
      </div>
      <label className={labelClass}>
        Description
        <textarea name="description" placeholder="Short public shop description" className={areaClass} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-bold text-black/65 dark:text-white/65">
          <input name="syncEnabled" type="checkbox" className="h-4 w-4 accent-black dark:accent-white" />
          Enable source sync flag
        </label>
        <SubmitButton busy={busy} label="Create / update shop" />
      </div>
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
    </form>
  );
}

export function ShopSettingsForm({ shop }: { shop: ShopAdminSummary }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError(null);
    try {
      await submitJson("PATCH", {
        action: "settings",
        creatorId: shop.creatorId,
        shopName: valueFrom(form, "shopName"),
        sourceType: valueFrom(form, "sourceType"),
        description: valueFrom(form, "description"),
        logoUrl: valueFrom(form, "logoUrl"),
        bannerUrl: valueFrom(form, "bannerUrl"),
        shopDomain: valueFrom(form, "shopDomain"),
        syncEnabled: checkedValue(form, "syncEnabled"),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Shop update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-xl border border-[#deded8] bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <summary className="cursor-pointer text-sm font-extrabold text-[#191917] dark:text-white">Shop setup and banner</summary>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className={labelClass}>
            Shop name
            <input name="shopName" defaultValue={shop.shopName} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Source
            <SourceSelect defaultValue={shop.sourceType} />
          </label>
          <label className={labelClass}>
            Shop domain / slug
            <input name="shopDomain" defaultValue={shop.shopDomain ?? ""} className={fieldClass} />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className={labelClass}>
            Logo URL
            <input name="logoUrl" defaultValue={shop.logoUrl ?? ""} placeholder="https://..." className={fieldClass} />
          </label>
          <label className={labelClass}>
            Banner URL
            <input name="bannerUrl" defaultValue={shop.bannerUrl ?? ""} placeholder="https://..." className={fieldClass} />
          </label>
        </div>
        <label className={labelClass}>
          Description
          <textarea name="description" defaultValue={shop.description} className={areaClass} />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-black/65 dark:text-white/65">
            <input name="syncEnabled" type="checkbox" defaultChecked={shop.syncEnabled} className="h-4 w-4 accent-black dark:accent-white" />
            Source sync enabled
          </label>
          <SubmitButton busy={busy} label="Save shop setup" />
        </div>
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
      </form>
    </details>
  );
}

export function NewProductForm({ creatorId }: { creatorId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError(null);
    try {
      await submitJson("POST", {
        creatorId,
        title: valueFrom(form, "title"),
        description: valueFrom(form, "description"),
        sourceType: valueFrom(form, "sourceType"),
        imageUrl: valueFrom(form, "imageUrl"),
        priceTokens: numberValue(form, "priceTokens"),
        inventoryQuantity: numberValue(form, "inventoryQuantity"),
        inventoryPolicy: valueFrom(form, "inventoryPolicy"),
      });
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product creation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-xl border border-[#deded8] bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <summary className="cursor-pointer text-sm font-extrabold text-[#191917] dark:text-white">Add product to this shop</summary>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className={labelClass}>
            Product title
            <input name="title" required className={fieldClass} />
          </label>
          <label className={labelClass}>
            Source
            <SourceSelect />
          </label>
          <label className={labelClass}>
            Price tokens
            <input name="priceTokens" type="number" min="0" defaultValue="0" className={fieldClass} />
          </label>
          <label className={labelClass}>
            Inventory
            <input name="inventoryQuantity" type="number" min="0" defaultValue="0" className={fieldClass} />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className={labelClass}>
            Image URL
            <input name="imageUrl" placeholder="https://..." className={fieldClass} />
          </label>
          <label className={labelClass}>
            Inventory policy
            <select name="inventoryPolicy" defaultValue="deny" className={fieldClass}>
              <option value="deny">Stop at 0</option>
              <option value="continue">Continue selling</option>
            </select>
          </label>
        </div>
        <label className={labelClass}>
          Description
          <textarea name="description" className={areaClass} />
        </label>
        <div className="flex justify-end">
          <SubmitButton busy={busy} label="Create product" />
        </div>
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
      </form>
    </details>
  );
}

export function ProductQuickEditForm({ product }: { product: ShopAdminProduct }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError(null);
    try {
      await submitJson("PATCH", {
        action: "product",
        productId: product.id,
        title: valueFrom(form, "title"),
        description: valueFrom(form, "description"),
        sourceType: valueFrom(form, "sourceType"),
        imageUrl: valueFrom(form, "imageUrl"),
        priceTokens: numberValue(form, "priceTokens"),
        inventoryQuantity: numberValue(form, "inventoryQuantity"),
        inventoryPolicy: valueFrom(form, "inventoryPolicy"),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-lg border border-[#deded8] bg-[#f7f7f4] p-3 dark:border-white/10 dark:bg-white/[0.04]">
      <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-[0.1em] text-black/45 dark:text-white/45">Quick edit</summary>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <div className="grid gap-2 md:grid-cols-4">
          <input name="title" defaultValue={product.title} placeholder="Title" className={fieldClass} />
          <SourceSelect defaultValue={product.sourceType} />
          <input name="priceTokens" type="number" min="0" defaultValue={product.priceTokens} className={fieldClass} />
          <input name="inventoryQuantity" type="number" min="0" defaultValue={product.inventoryQuantity ?? 0} className={fieldClass} />
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_180px]">
          <input name="imageUrl" defaultValue={product.imageUrl ?? ""} placeholder="Image URL" className={fieldClass} />
          <select name="inventoryPolicy" defaultValue={product.inventoryPolicy} className={fieldClass}>
            <option value="deny">Stop at 0</option>
            <option value="continue">Continue selling</option>
          </select>
        </div>
        <textarea name="description" defaultValue={product.description} placeholder="Description" className={areaClass} />
        <div className="flex justify-end">
          <SubmitButton busy={busy} label="Save product" />
        </div>
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
      </form>
    </details>
  );
}
