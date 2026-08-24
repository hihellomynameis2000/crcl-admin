"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Banknote, ChartNoAxesCombined, FileCheck2, Flame, Home, Megaphone, Radio, Settings, Shield, ShoppingBag, Users, WalletCards } from "lucide-react";
import BrandLogo from "../common/BrandLogo";

const sections = [
  { label: "Overview", items: [{ href: "/", label: "Dashboard", icon: Home }, { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined }, { href: "/finance", label: "Finance", icon: Banknote }, { href: "/withdrawals", label: "Withdrawals", icon: WalletCards }, { href: "/settings", label: "Settings", icon: Settings }] },
  { label: "Operations", items: [{ href: "/users", label: "Users", icon: Users }, { href: "/creators", label: "Creators", icon: Shield }, { href: "/shop", label: "Shop controls", icon: ShoppingBag }, { href: "/applications", label: "Applications", icon: FileCheck2 }, { href: "/broadcast", label: "Broadcast", icon: Megaphone }] },
  { label: "Moderation", items: [{ href: "/content", label: "Content", icon: Flame }, { href: "/live", label: "Live streams", icon: Radio }, { href: "/system/logs", label: "System logs", icon: Activity }] },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden h-screen w-[248px] shrink-0 overflow-y-auto border-r border-[#deded8] bg-[#fbfbfa] dark:bg-[#11110f] md:block">
      <div className="flex h-[68px] items-center border-b border-[#e7e7e1] px-5"><BrandLogo /></div>
      <nav className="px-3 py-4 text-sm">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-black/35 dark:text-white/35">{section.label}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      "flex h-9 items-center gap-3 rounded-md px-3 font-semibold transition " +
                      (active ? "bg-[#1b1b19] text-white shadow-sm dark:bg-white dark:text-black" : "text-black/58 hover:bg-black/[0.045] hover:text-black dark:text-white/58 dark:hover:bg-white/10 dark:hover:text-white")
                    }
                  >
                    <Icon size={16} strokeWidth={2.2} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
