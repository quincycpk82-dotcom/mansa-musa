// Fetches live stock prices from Yahoo Finance
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
    const symbols = TICKERS.join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,symbol,regularMarketChangePercent`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);

    const data = await res.json();
    const quotes = data?.quoteResponse?.result || [];
    const prices: Record<string, number> = {};
    const changes: Record<string, number> = {};

    for (const q of quotes) {
      if (q.regularMarketPrice) {
        prices[q.symbol] = q.regularMarketPrice;
        changes[q.symbol] = q.regularMarketChangePercent ?? 0;
      }
    }

    return new Response(JSON.stringify({ prices, changes, timestamp: new Date().toISOString() }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), prices: {}, changes: {} }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
