import { format, parseISO } from "date-fns";
import { DevelopmentCard } from "./DevelopmentCard";
import type { Run } from "@/types/digest";

export function RunBlock({ run, date, runIndex, totalRuns }: { run: Run; date: string; runIndex: number; totalRuns: number }) {
  const t = (() => {
    try {
      return format(parseISO(run.run_at), "HH:mm");
    } catch {
      return run.run_at;
    }
  })();
  const label = totalRuns > 1 ? `Run ${runIndex + 1} · ${t}` : t;

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-mono uppercase tracking-wider text-neutral-500">{label}</p>
        <p className="text-xl leading-snug font-medium">{run.headline}</p>
      </div>

      <div className="space-y-8 pl-px border-l-2 border-neutral-200 dark:border-neutral-800 [&>article]:pl-5">
        {run.developments.map((dev) => (
          <DevelopmentCard key={dev.id} dev={dev} date={date} />
        ))}
      </div>

      {run.themes.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Themes</h2>
          {run.themes.map((th) => (
            <div key={th.title} className="space-y-1">
              <h3 className="text-sm font-semibold">{th.title}</h3>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">{th.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      {run.worth_reading.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Worth reading in full</h2>
          <ul className="space-y-2">
            {run.worth_reading.map((wr, i) => (
              <li key={i} className="text-sm">
                <a href={wr.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                  {wr.label}
                </a>
                <span className="text-neutral-600 dark:text-neutral-400"> — {wr.why}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {run.skipped_summary ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-500 italic">Skipped: {run.skipped_summary}</p>
      ) : null}
    </section>
  );
}
