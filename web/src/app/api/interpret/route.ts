export const dynamic = "force-dynamic";

export async function POST() {
  return new Response("AI explain not wired yet — coming in stage 3.", {
    status: 503,
    headers: { "content-type": "text/plain" },
  });
}
