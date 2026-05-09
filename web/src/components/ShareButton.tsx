"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Share2, Copy, Check, X } from "lucide-react";
import type { Development } from "@/types/digest";

const LABELS = {
  en: { take: "Take", tags: "Tags", sources: "Sources", colon: ":", copy: "Copy", copied: "Copied", share: "Share" },
  zh: { take: "Take", tags: "标签", sources: "来源", colon: "：", copy: "复制", copied: "已复制", share: "分享" },
} as const;

function buildShareText({ dev, date, lang }: { dev: Development; date: string; lang: "en" | "zh" }) {
  const L = LABELS[lang];
  const lines: string[] = [dev.title, "", `${L.take}${L.colon} ${dev.take}`];
  if (dev.tags.length > 0) {
    lines.push("", `${L.tags}${L.colon} ${dev.tags.join(", ")}`);
  }
  if (dev.links.length > 0) {
    lines.push("", `${L.sources}${L.colon}`);
    for (const l of dev.links) lines.push(l.url);
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  lines.push("", `via ${origin}/feed/d/${date}#${dev.id}`);
  return lines.join("\n");
}

export function ShareButton({ dev, date }: { dev: Development; date: string }) {
  const search = useSearchParams();
  const lang: "en" | "zh" = search.get("lang") === "zh" ? "zh" : "en";
  const L = LABELS[lang];

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = buildShareText({ dev, date, lang });

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — the textarea below is still selectable
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={L.share}
        className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <Share2 size={11} />
        {L.share}
      </button>
      {open ? (
        <div className="basis-full mt-2 p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 text-sm space-y-2">
          <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300 m-0">
            {text}
          </pre>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setOpen(false);
                setCopied(false);
              }}
              aria-label="close"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X size={11} />
            </button>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? L.copied : L.copy}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
