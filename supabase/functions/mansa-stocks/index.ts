// Fetches live stock prices from Finnhub
// Deploy: supabase functions deploy mansa-stocks --no-verify-jwt

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const TICKERS = ["VOO", "VTI", "MSFT", "NVDA", "AMZN", "HOOD", "UBER", "NFLX"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const apiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!apiKey) throw new Error("FINNHUB_API_KEY not configured");

    const results = await Promise.all(
      TICKERS.map(async (symbol) => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
        );
        const data = await res.json();
        return { symbol, price: data.c, change: data.dp }; // c = current price, dp = % change
      })
    );

    const prices: Record<string, number> = {};
    const changes: Record<string, number> = {};

    for (const { symbol, price, change } of results) {
      if (price && price > 0) {
        prices[symbol] = price;
        changes[symbol] = change ?? 0;
      }
    }

    return new Response(
      JSON.stringify({ prices, changes, timestamp: new Date().toISOString() }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err), prices: {}, changes: {} }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
