import Link from "next/link";

export function TagBadge({ tag, active }: { tag: string; active?: boolean }) {
  return (
    <Link
      href={`/archive?tag=${encodeURIComponent(tag)}`}
      className={
        "inline-block px-2 py-0.5 text-xs font-mono rounded " +
        (active
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700")
      }
    >
      {tag}
    </Link>
  );
}
