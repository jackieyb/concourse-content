import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local for local dev and to your Vercel project env vars for deployment.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const MODELS = {
  generation: "claude-opus-4-7",
  ranking: "claude-sonnet-4-6",
} as const;
