import Link from "next/link";
import { format, parseISO } from "date-fns";
import { listDates, getDigest, tagCloud } from "@/lib/digest";
import { TagBadge } from "@/components/TagBadge";

export const dynamic = "force-dynamic";

type Row = {
  date: string;
  headline: string;
  tags: string[];
  developments: number;
};

export default async function ArchivePage({ searchParams }: { searchParams: { tag?: string } }) {
  const filterTag = typeof searchParams?.tag === "string" ? searchParams.tag : null;

  const dates = await listDates();
  const tags = await tagCloud(60);

  const rows: Row[] = [];
  for (const d of dates) {
    const dg = await getDigest(d);
    if (!dg) continue;
    // Aggregate across runs for the row view.
    const tagsSet = new Set<string>();
    let devs = 0;
    let firstHeadline = "";
    for (const r of dg.runs) {
      if (!firstHeadline) firstHeadline = r.headline;
      devs += r.developments.length;
      for (const dev of r.developments) for (const t of dev.tags) tagsSet.add(t);
    }
    const allTags = [...tagsSet];
    if (filterTag && !allTags.includes(filterTag)) continue;
    rows.push({ date: d, headline: firstHeadline, tags: allTags, developments: devs });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Archive</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {rows.length} digest{rows.length === 1 ? "" : "s"}
          {filterTag ? (
            <>
              {" "}
              tagged{" "}
              <code className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 font-mono">{filterTag}</code>{" "}
              <Link href="/archive" className="text-blue-600 dark:text-blue-400 hover:underline">
                clear
              </Link>
            </>
          ) : null}
        </p>
      </header>

      {!filterTag && tags.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-2">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <TagBadge key={t.tag} tag={t.tag} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {rows.map((row) => {
          const dateLabel = (() => {
            try {
              return format(parseISO(row.date), "MMM d, yyyy");
            } catch {
              return row.date;
            }
          })();
          return (
            <article key={row.date} className="py-4 space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <Link href={`/d/${row.date}`} className="text-base font-medium hover:underline">
                  {dateLabel}
                </Link>
                <span className="text-xs font-mono text-neutral-500 shrink-0">{row.developments} items</span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{row.headline}</p>
              <div className="flex flex-wrap gap-1.5">
                {row.tags.slice(0, 8).map((t) => (
                  <TagBadge key={t} tag={t} active={t === filterTag} />
                ))}
              </div>
            </article>
          );
        })}
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-neutral-500">No digests match.</p>
        ) : null}
      </section>
    </div>
  );
}
