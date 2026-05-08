import { Client } from "pg";

/**
 * Per-model published rates (USD per 1M tokens). Hardcoded for now — can move
 * to env or DB once we have more than two models. Numbers are approximate;
 * authoritative billing is in Azure Cost Management.
 */
const RATES: Record<string, { inUsdPerMtok: number; outUsdPerMtok: number }> = {
  "Llama-3.3-70B-Instruct": { inUsdPerMtok: 0.71, outUsdPerMtok: 0.71 },
  "gpt-4o-mini": { inUsdPerMtok: 0.15, outUsdPerMtok: 0.6 },
  "gpt-4o": { inUsdPerMtok: 2.5, outUsdPerMtok: 10 },
};

export function estimateCostUsd(
  model: string,
  promptTokens: number | null,
  completionTokens: number | null,
): number | null {
  const rate = RATES[model];
  if (!rate || promptTokens == null || completionTokens == null) return null;
  return (
    (promptTokens / 1_000_000) * rate.inUsdPerMtok +
    (completionTokens / 1_000_000) * rate.outUsdPerMtok
  );
}

export type CostEvent = {
  service: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  durationMs: number | null;
  metadata?: Record<string, unknown>;
};

function clientConfig() {
  return {
    host: process.env.COST_PG_HOST ?? "db",
    port: parseInt(process.env.COST_PG_PORT ?? "5432", 10),
    user: process.env.COST_PG_USER ?? "cost_tracker",
    password: process.env.COST_PG_PASSWORD ?? "",
    database: process.env.COST_PG_DB ?? "cost_tracker",
  };
}

/**
 * Best-effort log. Never throws; logs to console and continues so a DB
 * outage can't break the user-facing call.
 */
export async function logCostEvent(e: CostEvent): Promise<void> {
  const c = new Client(clientConfig());
  try {
    await c.connect();
    await c.query(
      `INSERT INTO cost_event
        (service, provider, model, input_tokens, output_tokens, cost_usd, duration_ms, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        e.service,
        e.provider,
        e.model,
        e.inputTokens,
        e.outputTokens,
        e.costUsd,
        e.durationMs,
        JSON.stringify(e.metadata ?? {}),
      ],
    );
  } catch (err) {
    console.warn(`[cost-log] insert failed: ${err instanceof Error ? err.message : err}`);
  } finally {
    await c.end().catch(() => {});
  }
}
