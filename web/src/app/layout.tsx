import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "ai-feed",
  description: "Daily frontier-AI digest, synthesized by a Claude agent.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased font-sans">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between text-sm">
            <Link href="/" className="font-semibold tracking-tight">
              ai-feed
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/archive" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
                Archive
              </Link>
              {session?.user ? (
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button type="submit" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
                    Sign out
                    {session.user.name ? <span className="ml-1 text-neutral-400">({session.user.name})</span> : null}
                  </button>
                </form>
              ) : (
                <Link href="/login" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
        <footer className="max-w-4xl mx-auto px-4 py-8 text-xs text-neutral-500">
          synthesized daily by a Claude Code agent · raw feeds aggregated by stdlib python ·{" "}
          <a href="https://github.com/WhatsFish/ai-feed" className="underline">
            source
          </a>
        </footer>
      </body>
    </html>
  );
}
