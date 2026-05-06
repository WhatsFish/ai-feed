import { notFound } from "next/navigation";
import Link from "next/link";
import { getDigest, getTranslation, listDates } from "@/lib/digest";
import { DigestView } from "@/components/DigestView";

export const dynamic = "force-dynamic";

export default async function DayPage({
  params,
  searchParams,
}: {
  params: { date: string };
  searchParams: { lang?: string };
}) {
  const lang: "en" | "zh" = searchParams?.lang === "zh" ? "zh" : "en";
  const digest = await getDigest(params.date);
  if (!digest) notFound();

  let toRender = digest;
  if (lang === "zh") {
    const zh = await getTranslation(params.date);
    if (zh) toRender = zh;
  }

  const dates = await listDates();
  const idx = dates.indexOf(params.date);
  const newer = idx > 0 ? dates[idx - 1] : null;
  const older = idx >= 0 && idx < dates.length - 1 ? dates[idx + 1] : null;

  return (
    <div className="space-y-12">
      <DigestView digest={toRender} lang={lang} />
      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-between text-sm">
        {older ? (
          <Link href={`/d/${older}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            ← {older}
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link href={`/d/${newer}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            {newer} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
