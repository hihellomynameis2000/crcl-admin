"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { label: string; endpoint: string; method?: "POST" | "PATCH" | "DELETE"; body?: Record<string, unknown>; confirmText?: string; tone?: "default" | "danger" };

export default function AdminButton({ label, endpoint, method = "POST", body, confirmText, tone = "default" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Admin action failed");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Admin action failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        "relative z-10 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition pointer-events-auto disabled:cursor-wait disabled:opacity-50 " +
        (tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-[#d7d7d1] bg-white text-black/70 hover:bg-[#f7f7f4]")
      }
    >
      {busy ? "Working" : label}
    </button>
  );
}
