import { DefaultAzureCredential, type AccessToken } from "@azure/identity";

// Cognitive Services / Azure AI scope. Works for AI Foundry inference and
// Azure AI Services OpenAI-compatible endpoints.
const SCOPE = "https://cognitiveservices.azure.com/.default";

const credential = new DefaultAzureCredential();

let cached: AccessToken | null = null;

/**
 * Fetch (and cache) an Entra ID access token for the Azure AI endpoint via
 * the host's managed identity. Refreshes 5 minutes before expiry.
 * (Same pattern as ai-playground/apps/web/src/lib/azure-ai.ts.)
 */
export async function getAzureAIToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresOnTimestamp - now > 5 * 60 * 1000) {
    return cached.token;
  }
  const token = await credential.getToken(SCOPE);
  if (!token) throw new Error("Failed to acquire Azure AI access token");
  cached = token;
  return token.token;
}

export const AZURE_AI_ENDPOINT = process.env.AZURE_AI_ENDPOINT ?? "";
export const AZURE_AI_DEFAULT_MODEL = process.env.AZURE_AI_DEFAULT_MODEL ?? "";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatCompletionsArgs = {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" } | { type: "text" };
};

/**
 * Single non-streaming chat completion against the OpenAI-compatible endpoint.
 * Throws on upstream error so the caller can wrap with the appropriate
 * HTTP response.
 */
export async function chatComplete(args: ChatCompletionsArgs): Promise<string> {
  if (!AZURE_AI_ENDPOINT) throw new Error("AZURE_AI_ENDPOINT not set");
  if (!AZURE_AI_DEFAULT_MODEL) throw new Error("AZURE_AI_DEFAULT_MODEL not set");

  const token = await getAzureAIToken();
  const r = await fetch(`${AZURE_AI_ENDPOINT.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AZURE_AI_DEFAULT_MODEL,
      messages: args.messages,
      stream: false,
      ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
      ...(args.max_tokens !== undefined ? { max_tokens: args.max_tokens } : {}),
      ...(args.response_format ? { response_format: args.response_format } : {}),
    }),
  });

  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`Azure AI ${r.status}: ${body.slice(0, 300)}`);
  }
  type ChatResp = { choices?: { message?: { content?: string } }[] };
  const data = (await r.json()) as ChatResp;
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
