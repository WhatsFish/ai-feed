"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function LangToggle({ lang }: { lang: "en" | "zh" }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function setLang(target: "en" | "zh") {
    if (target === lang) return;
    const params = new URLSearchParams(search.toString());
    if (target === "en") params.delete("lang");
    else params.set("lang", "zh");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="inline-flex text-xs font-mono rounded border border-neutral-300 dark:border-neutral-700 overflow-hidden">
      <button
        onClick={() => setLang("en")}
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
        className={
          "px-2 py-1 " +
          (lang === "zh"
            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            : "hover:bg-neutral-100 dark:hover:bg-neutral-800")
        }
      >
        中文
      </button>
    </div>
  );
}
