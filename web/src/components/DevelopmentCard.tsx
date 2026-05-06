import { ExternalLink } from "lucide-react";
import { TagBadge } from "./TagBadge";
import { InterpretButton } from "./InterpretButton";
import type { Development } from "@/types/digest";

export function DevelopmentCard({ dev, date }: { dev: Development; date: string }) {
  return (
    <article id={dev.id} className="space-y-2.5 scroll-mt-20">
      <h3 className="text-base font-semibold leading-snug">{dev.title}</h3>
      <p className="text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-line">{dev.take}</p>
      {dev.links.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {dev.links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              {l.label}
              <ExternalLink size={12} />
            </a>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {dev.tags.map((t) => (
          <TagBadge key={t} tag={t} />
        ))}
        <InterpretButton date={date} developmentId={dev.id} />
      </div>
    </article>
  );
}
