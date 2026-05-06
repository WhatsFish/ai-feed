"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

export function InterpretButton({ date, developmentId }: { date: string; developmentId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (text || loading) {
      setOpen((v) => !v);
      return;
    }
    setLoading(true);
    setOpen(true);
    setError(null);
    try {
      const r = await fetch(`/feed/api/interpret`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, developmentId }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { text: string };
      setText(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "interpret failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={ask}
        className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
        AI explain
      </button>
      {open ? (
        <div className="basis-full mt-2 p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
          {error ? <span className="text-red-600">{error}</span> : null}
          {loading && !text ? "thinking…" : null}
          {text}
        </div>
      ) : null}
    </>
  );
}
