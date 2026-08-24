"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const onClick = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };
  return (
    <button onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7d7d1] bg-white px-3 text-sm font-semibold text-black/65 hover:bg-[#f7f7f4]">
      <LogOut size={16} /> Sign out
    </button>
  );
}
