import type { Metadata } from "next";
import "./globals.css";
import { cookies } from "next/headers";
import Sidebar from "../src/components/layout/Sidebar";
import Topbar from "../src/components/layout/Topbar";
import ToastProvider from "../src/components/ui/ToastProvider";
import { ADMIN_COOKIE_NAME, isValidAdminSessionToken } from "../src/lib/adminAuth";

export const metadata: Metadata = {
  title: "CRCL Admin",
  description: "CRCL platform control, moderation, finance, and analytics dashboard",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isAdminLoggedIn = await isValidAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  return (
    <html lang="en">
      <body className="bg-[var(--admin-bg)] font-sans text-[var(--admin-ink)] antialiased">
        <ToastProvider>
          {isAdminLoggedIn ? (
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar />
                <main className="flex-1 overflow-y-auto px-4 py-5 md:px-7 md:py-7">{children}</main>
              </div>
            </div>
          ) : (
            children
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
