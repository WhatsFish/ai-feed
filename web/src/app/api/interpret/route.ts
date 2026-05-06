import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { foundry, FOUNDRY_MODEL } from "@/lib/foundry";
import { getDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";

/**
 * POST /api/interpret { date, developmentId }
 * Returns a deeper-dive explanation of one development from the day's digest.
 * The model gets the agent's existing take as context plus all themes from the
 * same run, and is asked to expand on what's likely most useful to a reader.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response("unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as { date?: string; developmentId?: string } | null;
  const date = body?.date;
  const devId = body?.developmentId;
  if (!date || !devId) return new Response("bad request", { status: 400 });

  const digest = await getDigest(date);
  if (!digest) return new Response("not found", { status: 404 });

  let dev: ReturnType<typeof Object> | null = null;
  let runHeadline = "";
  let runThemes: string[] = [];
  for (const r of digest.runs) {
    const found = r.developments.find((d) => d.id === devId);
    if (found) {
      dev = found;
      runHeadline = r.headline;
      runThemes = r.themes.map((t) => `- ${t.title}: ${t.body}`);
      break;
    }
  }
  if (!dev) return new Response("development not found", { status: 404 });

  const sys =
    "You are an AI/research analyst helping a busy technical reader go deeper on a news item. " +
    "You will be given the agent's existing one-paragraph take, plus broader themes from the same day. " +
    "Produce a 150–250 word follow-up that adds genuine value: connect to prior work, name the open question, flag what would change your view. " +
    "Don't repeat the original take verbatim. No marketing tone, no hedging boilerplate. Plain prose, no headings, no bullet points.";

  type DevShape = {
    title: string;
    take: string;
    tags: string[];
    links: { label: string; url: string }[];
  };
  const d = dev as DevShape;
  const userMsg = [
    `Day's headline: ${runHeadline}`,
    "",
    `Item: ${d.title}`,
    `Tags: ${d.tags.join(", ")}`,
    "",
    "Agent's take (do not repeat):",
    d.take,
    "",
    `Sources:`,
    ...d.links.map((l) => `- ${l.label}: ${l.url}`),
    runThemes.length ? "" : "",
    runThemes.length ? "Same-day themes:" : "",
    ...runThemes,
  ]
    .filter((s) => s !== null)
    .join("\n");

  const client = foundry();
  const resp = await client.chat.completions.create({
    model: FOUNDRY_MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: userMsg },
    ],
    temperature: 0.4,
    max_tokens: 500,
  });

  const text = resp.choices[0]?.message?.content?.trim() ?? "";
  if (!text) return new Response("empty model response", { status: 502 });

  return Response.json({ text });
}
