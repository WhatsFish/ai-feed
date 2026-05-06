import OpenAI from "openai";

let cached: OpenAI | null = null;

/**
 * Azure AI Foundry client. Uses the Models API endpoint which is OpenAI-compatible
 * — typically https://<resource>.services.ai.azure.com/models. Authenticates via
 * the api-key header (Azure pattern), not bearer.
 */
export function foundry(): OpenAI {
  if (cached) return cached;
  const baseURL = process.env.AZURE_AI_BASE_URL;
  const apiKey = process.env.AZURE_AI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error("AZURE_AI_BASE_URL and AZURE_AI_API_KEY must be set");
  }
  cached = new OpenAI({
    baseURL,
    apiKey,
    defaultHeaders: { "api-key": apiKey },
    defaultQuery: { "api-version": "2024-08-01-preview" },
  });
  return cached;
}

export const FOUNDRY_MODEL = process.env.AZURE_AI_MODEL ?? "gpt-4o-mini";
