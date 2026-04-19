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

export async function callClaude(params: {
  apiKey: string;
  system: string;
  messages: any[];
  tools?: any[];
  maxTokens?: number;
  model?: string;
}) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model || "claude-sonnet-4-5-20250929",
      max_tokens: params.maxTokens || 2000,
      system: params.system,
      tools: params.tools,
      messages: params.messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  return res.json();
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
