"use client";

import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/ToastProvider";

async function createItem(
  type: "categories" | "collections" | "landingPages",
  name: string,
  showToast: (msg: string, type?: "success" | "error") => void
) {
  const res = await fetch(`/api/${type}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  const json = await res.json();

  if (!res.ok) {
    if (json.error?.includes("exists")) {
      showToast("This already exists", "error");
    } else {
      showToast(json.error || "Failed to create item", "error");
    }
    return null;
  }

  return json;
}

interface Option {
  id: string;
  name: string;
  slug?: string;
}

interface DropdownProps {
  label?: string;
  options: Option[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  allowCreate?: boolean;
  onCreate?: (name: string) => Promise<{ id: string; name: string; slug: string }>;
  placeholder?: string;
  type: "categories" | "collections" | "landingPages";
}

export default function Dropdown({
  label,
  options,
  selectedId,
  onSelect,
  allowCreate = false,
  placeholder = "Select",
  type,
  onCreate,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newValue, setNewValue] = useState("");

  const [localOptions, setLocalOptions] = useState(options);
  useEffect(() => { setLocalOptions(options); }, [options]);

  const { showToast } = useToast();

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Click outside → close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="text-xs font-medium text-gray-600 dark:text-white/60 uppercase mb-1 block">
          {label}
        </label>
      )}

      {/* Trigger */}
      <div
        onClick={() => setOpen(!open)}
        className="hover-tip w-full flex justify-between items-center rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition"
      >
        <span>
          {selectedId ? localOptions.find(o => o.id === selectedId)?.name : placeholder}
        </span>

        <img
          src="/icons/CaretDownIcon.svg"
          className={`w-3 h-3 opacity-60 transition-transform dark:invert ${open ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-lg max-h-48 overflow-auto p-1 space-y-1">

          {/* Option Items */}
          {Array.from(new Map(localOptions.map(o => [o.id, o]))).map(([_, option]) => (
            <div
              key={option.id}
              onClick={() => {
                onSelect(option.id);

                // Keep menu open for categories so newly created options appear immediately
                if (type === "categories") {
                  setOpen(true);
                } else {
                  setOpen(false);
                }
              }}
              className="hover-tip px-3 py-2 text-sm text-gray-900 dark:text-white rounded-md hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition"
            >
              {option.name}
            </div>
          ))}

          {/* CREATE NEW */}
          {allowCreate && !creating && (
            <div
              onClick={() => {
                setCreating(true);
                setNewValue("");
                setTimeout(() => {
                  const input = document.getElementById("dropdown-create-input");
                  if (input) input.focus();
                }, 10);
              }}
              className="hover-tip flex items-center gap-2 px-3 py-2 text-sm text-[#6FB3EC] rounded-md hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer transition"
            >
              <svg fill="currentColor" className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M12 5c.552 0 1 .448 1 1v5h5c.552 0 1 .448 1 1s-.448 1-1 1h-5v5c0 .552-.448 1-1 1s-1-.448-1-1v-5H6c-.552 0-1-.448-1-1s.448-1 1-1h5V6c0-.552.448-1 1-1z" />
              </svg>
              Create new
            </div>
          )}

          {/* INPUT MODE */}
          {creating && (
            <div className="px-3 py-2">
              <input
                id="dropdown-create-input"
                type="text"
                className="w-full rounded-md border border-gray-300 dark:border-white/20 bg-white dark:bg-[#1a1a1a] px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none"
                placeholder={`New ${type.slice(0, -1)}`}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={async e => {
                  if (e.key === "Enter" && newValue.trim()) {
                    const result = await createItem(type, newValue.trim(), showToast);
                    if (!result) return;

                    const created =
                      type === "categories"
                        ? result.category
                        : type === "collections"
                        ? result.collection
                        : result.landingPage;

                    let finalCreated = created;

                    if (onCreate) {
                      const returned = await onCreate(finalCreated);
                      if (returned) finalCreated = returned;
                    }

                    setLocalOptions(prev => [...prev, finalCreated]);

                    onSelect(finalCreated.id);

                    setCreating(false);
                    setOpen(true);
                  }

                  if (e.key === "Escape") {
                    setCreating(false);
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}