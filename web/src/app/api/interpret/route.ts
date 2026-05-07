import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { chatComplete } from "@/lib/azure-ai";
import { estimateCostUsd, logCostEvent } from "@/lib/cost-log";
import { getDigest } from "@/lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/interpret { date, developmentId }
 * Returns a deeper-dive explanation of one development from the day's digest.
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

  type DevShape = {
    title: string;
    take: string;
    tags: string[];
    links: { label: string; url: string }[];
  };
  let dev: DevShape | null = null;
  let runHeadline = "";
  let runThemes: string[] = [];
  for (const r of digest.runs) {
    const found = r.developments.find((d) => d.id === devId);
    if (found) {
      dev = found as DevShape;
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

  const userMsg = [
    `Day's headline: ${runHeadline}`,
    "",
    `Item: ${dev.title}`,
    `Tags: ${dev.tags.join(", ")}`,
    "",
    "Agent's take (do not repeat):",
    dev.take,
    "",
    `Sources:`,
    ...dev.links.map((l) => `- ${l.label}: ${l.url}`),
    runThemes.length ? "" : "",
    runThemes.length ? "Same-day themes:" : "",
    ...runThemes,
  ]
    .filter((s) => s !== null)
    .join("\n");

  let result;
  try {
    result = await chatComplete({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userMsg },
      ],
      temperature: 0.4,
      max_tokens: 500,
    });
  } catch (e) {
    return new Response(`upstream: ${e instanceof Error ? e.message : "unknown"}`, { status: 502 });
  }

  if (!result.content) return new Response("empty model response", { status: 502 });

  // Best-effort cost log; doesn't block the response.
  void logCostEvent({
    service: "foundry-interpret",
    provider: "azure-foundry",
    model: result.model,
    inputTokens: result.usage.prompt_tokens,
    outputTokens: result.usage.completion_tokens,
    costUsd: estimateCostUsd(result.model, result.usage.prompt_tokens, result.usage.completion_tokens),
    durationMs: result.durationMs,
    metadata: { date, developmentId: devId, dev_title: dev.title },
  });

  return Response.json({ text: result.content });
}
