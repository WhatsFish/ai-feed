import { format, parseISO } from "date-fns";
import { RunBlock } from "./RunBlock";
import { LangToggle } from "./LangToggle";
import type { Digest } from "@/types/digest";

export function DigestView({ digest, lang }: { digest: Digest; lang: "en" | "zh" }) {
  const dateLabel = (() => {
    try {
      return format(parseISO(digest.date), "EEEE, MMMM d, yyyy");
    } catch {
      return digest.date;
    }
  })();

  // Newest run first
  const runs = [...digest.runs].reverse();

  return (
    <article className="space-y-12">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{dateLabel}</h1>
          <LangToggle lang={lang} date={digest.date} />
        </div>
        <p className="text-xs text-neutral-500 font-mono">
          {digest.runs.length} run{digest.runs.length === 1 ? "" : "s"} · {digest.stats.raw_items} raw items ·{" "}
          {digest.stats.sources_ok} sources
          {digest.stats.sources_failed.length > 0 ? `, ${digest.stats.sources_failed.length} failed` : ""}
        </p>
      </header>

      {runs.map((run, idx) => (
        <RunBlock key={run.run_at} run={run} date={digest.date} runIndex={digest.runs.length - 1 - idx} totalRuns={digest.runs.length} />
      ))}
    </article>
  );
}
