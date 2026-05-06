import { promises as fs } from "fs";
import path from "path";
import { DigestSchema, type Digest } from "@/types/digest";

const DIGEST_DIR = process.env.DIGEST_DIR ?? "/data/digest";

export async function listDates(): Promise<string[]> {
  try {
    const entries = await fs.readdir(DIGEST_DIR);
    const dates = entries
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => f.replace(/\.json$/, ""))
      .sort()
      .reverse();
    return dates;
  } catch {
    return [];
  }
}

export async function getDigest(date: string): Promise<Digest | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const file = path.join(DIGEST_DIR, `${date}.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return DigestSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function getLatest(): Promise<Digest | null> {
  const dates = await listDates();
  if (dates.length === 0) return null;
  return getDigest(dates[0]);
}

export async function getTranslation(date: string): Promise<Digest | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const file = path.join(DIGEST_DIR, `${date}.zh.json`);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return DigestSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveTranslation(date: string, digest: Digest): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("invalid date");
  const file = path.join(DIGEST_DIR, `${date}.zh.json`);
  await fs.writeFile(file, JSON.stringify(digest, null, 2), "utf-8");
}

/** All distinct tags across the latest N digests, with counts (for filter UI). */
export async function tagCloud(limit = 30): Promise<{ tag: string; count: number }[]> {
  const dates = (await listDates()).slice(0, limit);
  const counts = new Map<string, number>();
  for (const d of dates) {
    const dg = await getDigest(d);
    if (!dg) continue;
    for (const r of dg.runs) {
      for (const dev of r.developments) {
        for (const t of dev.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
