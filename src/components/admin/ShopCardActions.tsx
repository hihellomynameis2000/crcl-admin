"use client";

import { Copy, Ellipsis, Star, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  creatorId: string;
  shopName: string;
  storeUrl: string;
  featured: boolean;
};

export default function ShopCardActions({ creatorId, shopName, storeUrl, featured }: Props) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const confirmationInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!confirmOpen) return;

    confirmationInputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setConfirmOpen(false);
        setConfirmation("");
        setError(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmOpen, busy]);

  async function copyStoreLink() {
    setError(null);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(storeUrl);
      } else {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = storeUrl;
        temporaryInput.style.position = "fixed";
        temporaryInput.style.opacity = "0";
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        document.execCommand("copy");
        temporaryInput.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError("Could not copy the store link.");
    }
  }

  function openConfirmation() {
    setMenuOpen(false);
    setError(null);
    setConfirmation("");
    setConfirmOpen(true);
  }

  async function toggleFeatured() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/shop", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "feature", creatorId, featured: !featured }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to update featured store");
      setMenuOpen(false);
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update featured store");
    } finally {
      setBusy(false);
    }
  }

  function closeConfirmation() {
    if (busy) return;
    setConfirmOpen(false);
    setConfirmation("");
    setError(null);
  }

  async function deleteStore() {
    if (confirmation.trim().toLowerCase() !== "delete") return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/shop", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ creatorId, confirmation }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to delete store");

      setConfirmOpen(false);
      setConfirmation("");
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to delete store");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={`Actions for ${shopName}`}
          aria-expanded={menuOpen}
          className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/35 text-white shadow-lg backdrop-blur transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Ellipsis className="h-5 w-5" aria-hidden="true" />
        </button>

        {menuOpen ? (
          <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-xl border border-[#deded8] bg-white p-1.5 text-[#171714] shadow-2xl dark:border-white/12 dark:bg-[#222220] dark:text-white">
            <button
              type="button"
              onClick={() => void toggleFeatured()}
              disabled={busy}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition hover:bg-black/[0.055] disabled:opacity-50 dark:hover:bg-white/[0.08]"
            >
              <Star className={`h-4 w-4 ${featured ? "fill-current" : ""}`} aria-hidden="true" />
              {featured ? "Remove feature" : "Feature store"}
            </button>
            <button
              type="button"
              onClick={() => void copyStoreLink()}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold transition hover:bg-black/[0.055] dark:hover:bg-white/[0.08]"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Link copied" : "Copy store link"}
            </button>
            <button
              type="button"
              onClick={openConfirmation}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete store
            </button>
            {error ? <p className="px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300">{error}</p> : null}
          </div>
        ) : null}
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 px-4 py-8 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeConfirmation();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-store-${creatorId}`}
            className="w-full max-w-md rounded-2xl border border-[#deded8] bg-white p-6 text-[#171714] shadow-2xl dark:border-white/12 dark:bg-[#191917] dark:text-white"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold text-red-700 dark:text-red-300">Delete store</p>
                <h2 id={`delete-store-${creatorId}`} className="mt-2 text-2xl font-black tracking-tight">
                  Are you sure you want to delete your store?
                </h2>
              </div>
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={busy}
                aria-label="Close delete confirmation"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.055] text-black/55 transition hover:text-black disabled:opacity-40 dark:bg-white/[0.08] dark:text-white/60 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-sm font-medium leading-6 text-black/55 dark:text-white/55">
              <span className="font-extrabold text-black dark:text-white">{shopName}</span> will be taken offline and its active products archived. Orders and ledger history will be preserved for monitoring.
            </p>
            <label className="mt-6 block text-sm font-bold" htmlFor={`delete-store-confirmation-${creatorId}`}>
              Type <span className="font-black">delete</span> to confirm
            </label>
            <input
              ref={confirmationInputRef}
              id={`delete-store-confirmation-${creatorId}`}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void deleteStore();
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="delete"
              className="mt-2 h-11 w-full rounded-lg border border-[#d7d7d1] bg-white px-3 text-sm font-semibold outline-none transition focus:border-black/45 dark:border-white/12 dark:bg-white/[0.05] dark:text-white dark:focus:border-white/40"
            />
            {error ? <p className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={busy}
                className="h-11 rounded-lg border border-[#d7d7d1] bg-white px-4 text-sm font-extrabold text-black/70 transition hover:bg-[#f7f7f4] disabled:opacity-50 dark:border-white/12 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.09]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteStore()}
                disabled={confirmation.trim().toLowerCase() !== "delete" || busy}
                className="h-11 rounded-lg bg-red-600 px-4 text-sm font-extrabold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-300 disabled:text-white/70 dark:disabled:bg-red-950 dark:disabled:text-white/30"
              >
                {busy ? "Deleting…" : "Delete store"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
