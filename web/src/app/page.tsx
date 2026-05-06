import Link from "next/link";
import { getLatest, getTranslation, listDates } from "@/lib/digest";
import { DigestView } from "@/components/DigestView";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: { lang?: string } }) {
  const lang: "en" | "zh" = searchParams?.lang === "zh" ? "zh" : "en";
  const latest = await getLatest();

  if (!latest) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">No digest yet</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          The agent runs at 08:13 and 20:13 Asia/Shanghai. Once it produces its first digest, it will appear here.
        </p>
      </div>
    );
  }

  let toRender = latest;
  if (lang === "zh") {
    const zh = await getTranslation(latest.date);
    if (zh) toRender = zh;
  }

  const dates = await listDates();
  const olderCount = Math.max(0, dates.length - 1);

  return (
    <div className="space-y-12">
      <DigestView digest={toRender} lang={lang} />
      {olderCount > 0 ? (
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 text-sm">
          <Link href="/archive" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← {olderCount} earlier digest{olderCount === 1 ? "" : "s"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
