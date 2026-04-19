// Mansa Scout — agentic opportunity hunter. Runs on cron.
// Deploy: supabase functions deploy mansa-scout --no-verify-jwt
// Schedule: see supabase/cron.sql

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { callClaude, CAPTAIN_PROFILE, CORS } from "../_shared/anthropic.ts";

// Free, no-auth search sources
async function searchReddit(query: string, subs: string[]): Promise<any[]> {
  const results: any[] = [];
  for (const sub of subs) {
    try {
      const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&sort=new&t=week&limit=5&restrict_sr=1`;
      const res = await fetch(url, { headers: { "User-Agent": "MansaMusa/1.0" } });
      if (!res.ok) continue;
      const data = await res.json();
      const posts = (data.data?.children || []).map((c: any) => ({
        source: "reddit",
        title: c.data.title,
        url: `https://reddit.com${c.data.permalink}`,
        snippet: (c.data.selftext || "").slice(0, 300),
        score: c.data.score,
        sub: c.data.subreddit,
      }));
      results.push(...posts);
    } catch (_) { /* skip failed sub */ }
  }
  return results;
}

async function searchHN(query: string): Promise<any[]> {
  try {
    const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i>${weekAgo}&hitsPerPage=8`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map((h: any) => ({
      source: "hn",
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      snippet: (h.story_text || "").slice(0, 300),
      points: h.points,
    }));
  } catch (_) { return []; }
}

// Tools exposed to Claude during the hunt
const SCOUT_TOOLS = [
  { type: "web_search_20250305", name: "web_search" },
  {
    name: "search_reddit",
    description: "Search specific subreddits for recent posts. Use for real-world discussion, deal flow, indie hacker chatter, coaching pricing, real estate strategies.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        subreddits: { type: "array", items: { type: "string" }, description: "e.g. ['Entrepreneur','SaaS','realestate','fatFIRE']" },
      },
      required: ["query", "subreddits"],
    },
  },
  {
    name: "search_hn",
    description: "Search Hacker News for tech/SaaS trends, new tools, technical opportunities from the last week.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "save_lead",
    description: "Save a high-value opportunity (relevance >= 7). Only save leads that score 7+ for Captain specifically.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short headline" },
        summary: { type: "string", description: "2-3 sentences" },
        source: { type: "string", enum: ["web", "reddit", "hn", "producthunt"] },
        source_url: { type: "string" },
        category: { type: "string", enum: ["tax", "investing", "real_estate", "saas", "coaching", "fitness", "brand", "gig", "content", "grant", "affiliate", "general"], description: "gig = freelance/contract/side hustle. content = creator monetization. grant = grants/contests/competitions. affiliate = partnership revenue." },
        relevance_score: { type: "integer", minimum: 1, maximum: 10 },
        income_type: { type: "string", enum: ["active", "passive", "semi_passive", "savings", "none"], description: "active = trade time for money. passive = set once earn forever. semi_passive = modest upkeep. savings = reduces tax or cost. none = educational only." },
        estimated_monthly: { type: "integer", description: "Realistic monthly $ potential for Captain. 0 if savings/educational." },
        time_to_first_dollar: { type: "string", enum: ["same_week", "2_4_weeks", "1_3_months", "3_6_months", "6_plus_months"], description: "How long before Captain sees his first $ from this." },
        effort_hours: { type: "integer", description: "Total hours to get it to first revenue. Be honest." },
        why_relevant: { type: "string", description: "One sentence on why this matches Captain's profile, skills, or interests." },
        suggested_action: { type: "string", description: "Concrete next step — what to literally do first." },
      },
      required: ["title", "summary", "source", "category", "relevance_score", "income_type", "estimated_monthly", "time_to_first_dollar", "effort_hours", "why_relevant", "suggested_action"],
    },
  },
];

const SCOUT_SYSTEM = `You are Mansa Musa's scouting agent, hunting wealth-building AND income-generating opportunities for Captain.

${CAPTAIN_PROFILE}

YOUR MISSION:
1. Review Captain's active interests (provided in the message).
2. Run 4-8 targeted searches across web, Reddit, and Hacker News.
3. Evaluate each finding against his profile, stack, capital, skills, and goals.
4. Save ONLY leads scoring 7+ via save_lead. Skip noise. Be ruthless.
5. A lead scores high when Captain can realistically act in 2-12 weeks using existing capital, skills, OR time.

CAPTAIN'S INCOME-GENERATING ASSETS (hunt across ALL of them):
- Tech skills: ships React/Supabase MVPs in days → gigs, contracts, micro-SaaS, consulting
- Lead SWE experience at UKG → technical advisory, code review, mentorship, courses
- Financial knowledge + AFC certification in progress → coaching, courses, paid newsletters, Foundation Forward monetization
- Former pro athlete → fitness coaching, training programs, sports commentary, brand deals
- Strong personal story (ex-pro athlete turned tech lead turned founder) → content, speaking, brand partnerships
- Natural mentor/people person → community-building, cohort-based courses, DMs-to-dollars playbooks
- Captain Enterprises LLC → consulting shell, contractor income, any 1099 work
- BrandLenz → dogfood it, use it for his own brand growth
- Foundation Forward users → upsell premium features, affiliate partnerships
- Writing ability → paid Substack, ghost-writing, LinkedIn influence
- Real estate experience → advise others, rental arbitrage, property management services

LEAD CATEGORIES (use them well):
- gig: freelance/contract/short-term income (Upwork, Contra, TopTal, direct client DMs)
- content: monetizing his story/knowledge (Substack, YouTube, LinkedIn, TikTok, paid newsletter)
- coaching: 1:1, cohorts, digital products — financial, fitness, tech career, mentorship
- saas: micro-SaaS / AI tools he can vibe-code
- affiliate: partnership revenue (influencer deals, referral programs, brand sponsorships)
- grant: contests, pitch competitions, accelerators, Black founder programs, HBCU alumni funds
- investing: dips in holdings, sector plays, new ETFs
- real_estate: acquisitions, rental arb, JV deals
- tax: moves that PRESERVE income (still valuable)
- brand: BrandLenz growth, influencer marketplace opportunities
- fitness: fitness-specific products/gigs

BIAS HEAVILY FOR:
- Opportunities that match Captain's UNIQUE intersection (Black ex-pro-athlete tech lead Christian founder with HBCU degree) — this intersection is RARE and valuable
- Time-to-first-dollar under 30 days for gig/content/coaching categories
- Concrete RFPs, open gigs, and grants with deadlines he can actually hit
- Plays that compound his existing platforms (Foundation Forward, BrandLenz, his personal brand)
- Founder programs, pitch contests, and grants (especially those targeting Black founders, HBCU alumni, or AI fintech)
- Paid speaking/podcast opportunities given his story
- Technical gigs paying $150+/hr for React/TypeScript/Supabase work

PENALIZE:
- Generic "passive income" listicles
- Opportunities requiring capital he doesn't have
- Crypto moonshots, MLM, dropshipping, get-rich-quick schemes
- Saturated markets with no differentiation edge for Captain
- Anything below $500/mo potential unless strategic (networking, content, brand)

SCORING CALIBRATION:
- 10 = unique to Captain's intersection, high $$$, fast ROI, concrete next step, deadline urgency
- 9 = strong match, meaningful income, clear path
- 8 = good match, needs modest bend to fit
- 7 = worth saving, but more generic
- <7 = don't save, don't waste a slot

End your run by stating leads saved and signing off. Don't narrate every search — hunt and save.`;

// Main scout loop — runs Claude agentically with tool use
async function runScoutAgent(params: {
  apiKey: string;
  userId: string;
  interests: any[];
  supabase: any;
}): Promise<{ leadsFound: number; details: any }> {
  const interestsText = params.interests.length > 0
    ? params.interests.map(i => `- ${i.category} (priority ${i.priority}): ${i.keywords.join(", ")}`).join("\n")
    : "Use Captain's default profile interests: tax strategy, micro-SaaS opportunities, real estate FL/GA, investment dips, coaching products.";

  const userMessage = `Begin hunt. Captain's active interests:\n\n${interestsText}\n\nFind 5-10 high-value opportunities. Save only 7+ scores.`;
  const messages: any[] = [{ role: "user", content: userMessage }];
  const savedLeads: any[] = [];
  const maxTurns = 15;

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await callClaude({
      apiKey: params.apiKey,
      system: SCOUT_SYSTEM,
      messages,
      tools: SCOUT_TOOLS,
      maxTokens: 4000,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") break;
    if (response.stop_reason !== "tool_use") break;

    // Execute tool calls
    const toolResults: any[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      if (block.name === "search_reddit") {
        const results = await searchReddit(block.input.query, block.input.subreddits);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(results.slice(0, 15)) });
      } else if (block.name === "search_hn") {
        const results = await searchHN(block.input.query);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(results) });
      } else if (block.name === "save_lead") {
        const lead = block.input;
        const { data, error } = await params.supabase.from("mansa_leads").insert({
          user_id: params.userId,
          title: lead.title,
          summary: lead.summary,
          source: lead.source,
          source_url: lead.source_url,
          category: lead.category,
          relevance_score: lead.relevance_score,
          income_type: lead.income_type,
          estimated_monthly: lead.estimated_monthly,
          time_to_first_dollar: lead.time_to_first_dollar,
          effort_hours: lead.effort_hours,
          why_relevant: lead.why_relevant,
          suggested_action: lead.suggested_action,
        }).select().single();
        if (!error) savedLeads.push(data);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: error ? `Error: ${error.message}` : `Saved lead ID ${data.id}` });
      } else if (block.name === "web_search") {
        // Web search is server-side, Anthropic handles it — it returns result blocks that we don't need to respond to
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Search executed by server." });
      }
    }

    if (toolResults.length === 0) break;
    messages.push({ role: "user", content: toolResults });
  }

  return { leadsFound: savedLeads.length, details: { leads: savedLeads.map(l => ({ id: l.id, title: l.title, score: l.relevance_score })) } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiKey || !supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Missing env vars" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const userId = body.user_id || Deno.env.get("CAPTAIN_USER_ID");

    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id required (pass in body or set CAPTAIN_USER_ID)" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Log run start
    const { data: run } = await supabase.from("mansa_runs").insert({ user_id: userId, run_type: "scout", status: "running" }).select().single();

    // Load interests
    const { data: interests } = await supabase.from("mansa_interests").select("*").eq("user_id", userId).eq("enabled", true).order("priority", { ascending: false });

    const result = await runScoutAgent({ apiKey, userId, interests: interests || [], supabase });

    // Update run log
    await supabase.from("mansa_runs").update({
      status: "success",
      leads_found: result.leadsFound,
      details: result.details,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), stack: (err as Error).stack }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
