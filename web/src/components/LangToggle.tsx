"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export function LangToggle({ lang, date }: { lang: "en" | "zh"; date: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setLang(target: "en" | "zh") {
    if (target === lang || loading) return;
    setError(null);

    if (target === "zh") {
      setLoading(true);
      try {
        const r = await fetch(`/feed/api/translate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date }),
        });
        if (!r.ok) throw new Error(`translate failed (${r.status})`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "translate failed");
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    const params = new URLSearchParams(search.toString());
    if (target === "en") params.delete("lang");
    else params.set("lang", "zh");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    router.refresh();
  }

  return (
    <div className="inline-flex items-center gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <div className="inline-flex text-xs font-mono rounded border border-neutral-300 dark:border-neutral-700 overflow-hidden">
        <button
          onClick={() => setLang("en")}
          disabled={loading}
          className={
            "px-2 py-1 " +
            (lang === "en"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-800")
          }
        >
          EN
        </button>
        <button
          onClick={() => setLang("zh")}
          disabled={loading}
          className={
            "px-2 py-1 inline-flex items-center gap-1 " +
            (lang === "zh"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "hover:bg-neutral-100 dark:hover:bg-neutral-800")
          }
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : null}
          中文
        </button>
      </div>
    </div>
  );
}
