"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, LogIn } from "lucide-react";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; text: string }
  | { kind: "needs-signin" }
  | { kind: "error"; message: string };

export function InterpretButton({ date, developmentId }: { date: string; developmentId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });

  async function ask() {
    if (state.kind === "ok" || state.kind === "needs-signin") {
      setOpen((v) => !v);
      return;
    }
    if (state.kind === "loading") return;
    setOpen(true);
    setState({ kind: "loading" });
    try {
      const r = await fetch(`/feed/api/interpret`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, developmentId }),
      });
      if (r.status === 401) {
        setState({ kind: "needs-signin" });
        return;
      }
      if (!r.ok) {
        setState({ kind: "error", message: (await r.text()) || `error ${r.status}` });
        return;
      }
      const data = (await r.json()) as { text: string };
      setState({ kind: "ok", text: data.text });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "interpret failed" });
    }
  }

  return (
    <>
      <button
        onClick={ask}
        className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        {state.kind === "loading" ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
        AI explain
      </button>
      {open ? (
        <div className="basis-full mt-2 p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 text-sm text-neutral-700 dark:text-neutral-300">
          {state.kind === "loading" ? "thinking…" : null}
          {state.kind === "ok" ? <p className="whitespace-pre-wrap">{state.text}</p> : null}
          {state.kind === "needs-signin" ? (
            <p className="flex items-center gap-2">
              <LogIn size={14} />
              <span>
                Sign in with GitHub to use AI explain.{" "}
                <Link href={`/login?from=/feed/d/${date}#${developmentId}`} className="underline">
                  Sign in
                </Link>
                .
              </span>
            </p>
          ) : null}
          {state.kind === "error" ? <p className="text-red-600">{state.message}</p> : null}
        </div>
      ) : null}
    </>
  );
}
