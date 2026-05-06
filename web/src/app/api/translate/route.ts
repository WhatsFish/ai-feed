import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { foundry, FOUNDRY_MODEL } from "@/lib/foundry";
import { getDigest, getTranslation, saveTranslation } from "@/lib/digest";
import type { Digest } from "@/types/digest";

export const dynamic = "force-dynamic";

/**
 * POST /api/translate { date }
 * Returns the Chinese version of the digest. Caches in digest/<date>.zh.json.
 *
 * The translation only touches user-facing strings (headline, take, theme body,
 * worth_reading.label/why, skipped_summary). All structural fields (id, tags,
 * links, dates, stats) are preserved verbatim.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response("unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as { date?: string } | null;
  const date = body?.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response("bad request", { status: 400 });
  }

  const cached = await getTranslation(date);
  if (cached) return Response.json(cached);

  const original = await getDigest(date);
  if (!original) return new Response("not found", { status: 404 });

  // Collect translatable strings keyed by stable paths.
  const items: { key: string; text: string }[] = [];
  const push = (key: string, text: string) => {
    if (text && text.trim()) items.push({ key, text });
  };
  for (let r = 0; r < original.runs.length; r++) {
    const run = original.runs[r];
    push(`r${r}.headline`, run.headline);
    push(`r${r}.skipped_summary`, run.skipped_summary);
    for (let d = 0; d < run.developments.length; d++) {
      push(`r${r}.d${d}.title`, run.developments[d].title);
      push(`r${r}.d${d}.take`, run.developments[d].take);
    }
    for (let t = 0; t < run.themes.length; t++) {
      push(`r${r}.t${t}.title`, run.themes[t].title);
      push(`r${r}.t${t}.body`, run.themes[t].body);
    }
    for (let w = 0; w < run.worth_reading.length; w++) {
      push(`r${r}.w${w}.label`, run.worth_reading[w].label);
      push(`r${r}.w${w}.why`, run.worth_reading[w].why);
    }
  }

  const inputJson = JSON.stringify(Object.fromEntries(items.map((i) => [i.key, i.text])));

  const sys = [
    "You translate AI-news digest text from English to simplified Chinese.",
    "Translate naturally for a technical Chinese reader; keep proper nouns (Anthropic, GPT-5.5, Claude, RDMA, etc.) untranslated.",
    "Preserve the tone — opinionated and direct, not corporate.",
    "Input is a JSON object: { key: english_text }. Output the SAME object shape: { key: chinese_text }.",
    "Output ONLY valid JSON, no prose, no code fences.",
  ].join(" ");

  const client = foundry();
  const resp = await client.chat.completions.create({
    model: FOUNDRY_MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: inputJson },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const out = resp.choices[0]?.message?.content ?? "{}";
  let translated: Record<string, string>;
  try {
    translated = JSON.parse(out);
  } catch {
    return new Response("translator returned invalid JSON", { status: 502 });
  }

  // Apply back to a clone of the original digest.
  const zh: Digest = JSON.parse(JSON.stringify(original));
  const setByKey = (key: string, value: string) => {
    const m = key.match(/^r(\d+)\.(.+)$/);
    if (!m) return;
    const r = parseInt(m[1], 10);
    const rest = m[2];
    if (rest === "headline") zh.runs[r].headline = value;
    else if (rest === "skipped_summary") zh.runs[r].skipped_summary = value;
    else {
      const dev = rest.match(/^d(\d+)\.(title|take)$/);
      if (dev) {
        zh.runs[r].developments[parseInt(dev[1], 10)][dev[2] as "title" | "take"] = value;
        return;
      }
      const th = rest.match(/^t(\d+)\.(title|body)$/);
      if (th) {
        zh.runs[r].themes[parseInt(th[1], 10)][th[2] as "title" | "body"] = value;
        return;
      }
      const wr = rest.match(/^w(\d+)\.(label|why)$/);
      if (wr) {
        zh.runs[r].worth_reading[parseInt(wr[1], 10)][wr[2] as "label" | "why"] = value;
      }
    }
  };
  for (const [k, v] of Object.entries(translated)) setByKey(k, v);

  await saveTranslation(date, zh);
  return Response.json(zh);
}
