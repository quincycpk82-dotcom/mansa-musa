// Shared profile + Anthropic helper. Imported by every edge function.

export const CAPTAIN_PROFILE = `CAPTAIN PHILLIP KIRKLAND PROFILE:
- Born 3/1/87, Quincy FL. Christian. Ex-pro football player.
- Lead SWE at UKG, $175K W-2. Computer Engineering, Bethune-Cookman.
- Captain Enterprises LLC owns Foundation Forward (live fintech PWA) and BrandLenz (influencer marketplace MVP, USPTO trademark secured).
- Tech stack: React, TypeScript, Vite, Supabase, Tailwind. Ships MVPs in days.
- Net worth ~$613K. 401k ~$184K. Brokerage ~$132K (VOO, VTI, MSFT, NVDA, AMZN, HOOD, UBER, NFLX). Cash ~$74K.
- Real estate: 3 FL properties, $274K equity, +$1,546/mo passive.
- Revocable trust structured. $1.35M life insurance.
- Gaps: no backdoor Roth yet, 401k loan $13.8K, NVDA call exp 5/15/26 underwater, S-Corp election not evaluated.
- Interests: anime, gaming, art, fitness, Christian faith, family, coaching, wealth-building, tax strategy, real estate, AI tech.
- Tone preference: imperial, direct, no sugar-coating, stoic, occasionally playful.`;

export const MANSA_PERSONA = `You are Mansa Musa — 14th-century Mali Emperor reborn as Captain's sovereign wealth strategist. Speak with regal authority and unflinching directness. No fluff.`;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_RETRIES = 3;
// Pause between calls when remaining token budget drops below this threshold
const TOKEN_THROTTLE_THRESHOLD = 5000;

// Parse Anthropic's reset header (e.g. "1s", "30s") into milliseconds
function parseResetMs(header: string | null): number {
  if (!header) return 0;
  const match = header.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? parseFloat(match[1]) * 1000 : 0;
}

// If we're close to the token rate limit, wait until the window resets
async function throttleIfNeeded(headers: Headers): Promise<void> {
  const remaining = parseInt(headers.get("x-ratelimit-remaining-tokens") ?? "99999");
  if (remaining < TOKEN_THROTTLE_THRESHOLD) {
    const waitMs = parseResetMs(headers.get("x-ratelimit-reset-tokens"));
    if (waitMs > 0) {
      console.warn(`Token throttle: ${remaining} tokens remaining. Waiting ${Math.ceil(waitMs / 1000)}s for reset.`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

export async function callClaude(params: {
  apiKey: string;
  system: string;
  messages: any[];
  tools?: any[];
  maxTokens?: number;
  model?: string;
}) {
  const body = JSON.stringify({
    model: params.model || "claude-sonnet-4-6",
    max_tokens: params.maxTokens || 1024,
    // Cache the system prompt — avoids billing full input tokens on every request
    system: [{ type: "text", text: params.system, cache_control: { type: "ephemeral" } }],
    tools: params.tools,
    messages: params.messages,
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": params.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body,
    });

    if (res.ok) {
      const data = await res.json();
      // Throttle before returning so multi-turn loops (e.g. mansa-scout) self-regulate
      await throttleIfNeeded(res.headers);
      return data;
    }

    const retryable = res.status === 429 || res.status === 529;
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    }

    // Honour the API's retry-after header, otherwise exponential backoff (1s → 2s → 4s)
    const retryAfter = res.headers.get("retry-after");
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
    console.warn(`Rate limited. Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
    await new Promise((r) => setTimeout(r, delay));
  }
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
