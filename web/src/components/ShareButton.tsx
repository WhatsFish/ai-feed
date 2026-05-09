"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Share2, Copy, Check, X } from "lucide-react";
import type { Development } from "@/types/digest";

const LABELS = {
  en: {
    take: "Take",
    tags: "Tags",
    sources: "Sources",
    colon: ":",
    copy: "Copy",
    copied: "Copied",
    share: "Share",
    close: "Close",
    title: "Share this item",
  },
  zh: {
    take: "Take",
    tags: "标签",
    sources: "来源",
    colon: "：",
    copy: "复制",
    copied: "已复制",
    share: "分享",
    close: "关闭",
    title: "分享这条新闻",
  },
} as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function canonicalUrl(date: string, id: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/feed/d/${date}#${id}`;
}

function buildSharePlainText({ dev, date, lang }: { dev: Development; date: string; lang: "en" | "zh" }) {
  const L = LABELS[lang];
  const lines: string[] = [dev.title, "", `${L.take}${L.colon} ${dev.take}`];
  if (dev.tags.length > 0) lines.push("", `${L.tags}${L.colon} ${dev.tags.join(", ")}`);
  if (dev.links.length > 0) {
    lines.push("", `${L.sources}${L.colon}`);
    for (const l of dev.links) lines.push(l.url);
  }
  lines.push("", `via ${canonicalUrl(date, dev.id)}`);
  return lines.join("\n");
}

function buildShareHtml({ dev, date, lang }: { dev: Development; date: string; lang: "en" | "zh" }) {
  const L = LABELS[lang];
  const url = canonicalUrl(date, dev.id);
  const parts: string[] = [];
  parts.push(`<p><strong>${escapeHtml(dev.title)}</strong></p>`);
  parts.push(`<p>${escapeHtml(dev.take)}</p>`);
  if (dev.tags.length > 0) {
    parts.push(`<p><em>${escapeHtml(L.tags)}${L.colon}</em> ${escapeHtml(dev.tags.join(", "))}</p>`);
  }
  if (dev.links.length > 0) {
    const linkLines = dev.links
      .map((l) => `<a href="${escapeHtml(l.url)}">${escapeHtml(l.label || l.url)}</a>`)
      .join("<br>");
    parts.push(`<p><em>${escapeHtml(L.sources)}${L.colon}</em><br>${linkLines}</p>`);
  }
  parts.push(`<p>— via <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`);
  return parts.join("");
}

export function ShareButton({ dev, date }: { dev: Development; date: string }) {
  const search = useSearchParams();
  const lang: "en" | "zh" = search.get("lang") === "zh" ? "zh" : "en";
  const L = LABELS[lang];

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const html = open ? buildShareHtml({ dev, date, lang }) : "";
  const text = open ? buildSharePlainText({ dev, date, lang }) : "";

  async function copy() {
    try {
      // Modern path: write both HTML and plain-text variants so paste targets
      // pick what they support (Word/Notion/Gmail → HTML, terminal/微信 → plain).
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // truly nothing we can do — user can still select text in the preview
      }
    }
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={L.share}
      title={L.share}
      className="ml-1.5 inline-flex items-center justify-center align-middle w-6 h-6 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800"
    >
      <Share2 size={13} />
    </button>
  );

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={L.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">{L.title}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={L.close}
            className="inline-flex items-center justify-center w-7 h-7 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <X size={16} />
          </button>
        </div>
        <div
          className="px-4 py-3 max-h-[60vh] overflow-y-auto text-[14px] leading-relaxed text-neutral-800 dark:text-neutral-200 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400 [&_strong]:font-semibold [&_em]:not-italic [&_em]:text-neutral-500"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? L.copied : L.copy}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {trigger}
      {open && mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
