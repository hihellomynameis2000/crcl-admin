"use client";

import Link from "next/link";
import { Moon, Search, ShieldCheck, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import SignOutButton from "./SignOutButton";

export default function Topbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const applyTheme = (isDark: boolean) => {
    document.documentElement.classList.toggle("dark", isDark);
    document.body.dataset.theme = isDark ? "dark" : "light";
  };

  useEffect(() => {
    const saved = localStorage.getItem("darkMode");
    const prefersDark =
      saved === "true" ||
      (saved === null && window.matchMedia("(prefers-color-scheme: dark)").matches);

    applyTheme(prefersDark);
    const animationFrame = requestAnimationFrame(() => setDarkMode(prefersDark));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem("darkMode") === null) {
        setDarkMode(event.matches);
        applyTheme(event.matches);
      }
    };
    media.addEventListener("change", handleChange);
    return () => {
      cancelAnimationFrame(animationFrame);
      media.removeEventListener("change", handleChange);
    };
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    applyTheme(next);
    localStorage.setItem("darkMode", next ? "true" : "false");
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? "/users?q=" + encodeURIComponent(trimmed) : "/users");
  };

  return (
    <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#deded8] bg-white/90 px-4 backdrop-blur dark:bg-[#11110f]/92 md:px-7">
      <form onSubmit={onSubmit} className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-md border border-[#d7d7d1] bg-[#f7f7f4] px-3 text-sm text-black/65 dark:bg-white/5 dark:text-white/70 md:max-w-xl">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users, creators, emails" className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-black/35 dark:placeholder:text-white/35" />
      </form>
      <div className="ml-4 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#d7d7d1] bg-white text-black/65 transition hover:bg-[#f7f7f4] dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
          title="Appearance"
          aria-label={darkMode ? "Use light mode" : "Use dark mode"}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <Link href="/system/logs" className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d7d7d1] bg-white px-3 text-sm font-semibold text-black/65 hover:bg-[#f7f7f4] dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10">
          <ShieldCheck size={16} /> Control room
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
