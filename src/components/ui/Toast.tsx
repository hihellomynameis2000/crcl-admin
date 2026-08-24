"use client";

export default function Toast({
  message,
  type = "success",
}: {
  message: string;
  type?: "success" | "error";
}) {
  return (
    <div
      className={`
        backdrop-blur-xl bg-white/30 dark:bg-white/10
        border border-white/20 dark:border-white/5
        text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2
        ${type === "error" ? "text-red-500" : "text-green-500"}
      `}
    >
      <span className="font-medium">{message}</span>

      <img
        src="/icons/XIcon.svg"
        className="w-3 h-3 opacity-70 cursor-pointer hover:opacity-100 transition"
      />
    </div>
  );
}
