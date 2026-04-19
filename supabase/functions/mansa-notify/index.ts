// Mansa Notify — sends daily email digest of new leads via Resend.
// Deploy: supabase functions deploy mansa-notify --no-verify-jwt
// Secret: supabase secrets set RESEND_API_KEY=re_xxxxx
// Secret: supabase secrets set MANSA_FROM_EMAIL=mansa@yourdomain.com
// Secret: supabase secrets set CAPTAIN_EMAIL=captain@yourdomain.com

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CORS } from "../_shared/anthropic.ts";

const CATEGORY_COLORS: Record<string, string> = {
  tax: "#C4962A", investing: "#5A7AAF", real_estate: "#9A5A3A",
  saas: "#4A8C6A", coaching: "#8C5A9A", fitness: "#3A8C8C",
  brand: "#C4554A", gig: "#6A9A5A", content: "#C47A3A",
  grant: "#B8A63A", affiliate: "#8A5ABF", general: "#6B5A3A",
};

const TIMELINE_LABELS: Record<string, string> = {
  same_week: "This week",
  "2_4_weeks": "2-4 weeks",
  "1_3_months": "1-3 months",
  "3_6_months": "3-6 months",
  "6_plus_months": "6+ months",
};

function formatMoney(n?: number): string | null {
  if (!n || n === 0) return null;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K/mo`;
  return `$${n}/mo`;
}

function renderDigestHTML(leads: any[]): string {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const totalMonthly = leads.reduce((sum, l) => sum + (l.estimated_monthly || 0), 0);

  const leadCards = leads.map(l => {
    const money = formatMoney(l.estimated_monthly);
    const timeline = TIMELINE_LABELS[l.time_to_first_dollar];
    const metaPills = [
      money ? `<span style="background:#0A0907;border:1px solid #3A2C0E;color:#C4962A;font-size:11px;padding:3px 8px;border-radius:4px;font-weight:600;margin-right:6px;display:inline-block;">⚡ ${money}</span>` : "",
      timeline ? `<span style="background:#0A0907;border:1px solid #1E1A0E;color:#8A7A48;font-size:11px;padding:3px 8px;border-radius:4px;margin-right:6px;display:inline-block;">⏱ ${timeline}</span>` : "",
      l.effort_hours ? `<span style="background:#0A0907;border:1px solid #1E1A0E;color:#8A7A48;font-size:11px;padding:3px 8px;border-radius:4px;display:inline-block;">${l.effort_hours}h effort</span>` : "",
    ].filter(Boolean).join("");

    return `
    <div style="background:#0F0E08;border:1px solid #1E1A0E;border-radius:10px;padding:18px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="background:${CATEGORY_COLORS[l.category] || "#6B5A3A"}22;color:${CATEGORY_COLORS[l.category] || "#C4962A"};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;padding:4px 10px;border-radius:4px;font-family:Georgia,serif;">${l.category.replace("_", " ")}</span>
        <span style="color:#6B5A2A;font-size:11px;letter-spacing:0.08em;">${l.relevance_score}/10</span>
        <span style="color:#4A3E1E;font-size:10px;margin-left:auto;text-transform:uppercase;">${l.source}</span>
      </div>
      ${metaPills ? `<div style="margin-bottom:10px;">${metaPills}</div>` : ""}
      <div style="color:#D4C890;font-size:16px;font-weight:600;margin-bottom:8px;font-family:Georgia,serif;">${l.title}</div>
      <div style="color:#9A8A58;font-size:13px;line-height:1.6;margin-bottom:10px;font-family:Georgia,serif;">${l.summary}</div>
      <div style="color:#C4962A;font-size:12px;font-style:italic;margin-bottom:8px;font-family:Georgia,serif;">⚜ ${l.why_relevant}</div>
      <div style="color:#8A7A48;font-size:12px;font-family:Georgia,serif;"><strong style="color:#C4962A;">Next move:</strong> ${l.suggested_action}</div>
      ${l.source_url ? `<div style="margin-top:10px;"><a href="${l.source_url}" style="color:#C4962A;font-size:12px;text-decoration:none;border-bottom:1px solid #3A2C0E;">View source →</a></div>` : ""}
    </div>`;
  }).join("");

  const totalLine = totalMonthly > 0
    ? `Combined monthly potential: <span style="color:#C4962A;font-weight:600;">${formatMoney(totalMonthly)}</span>.`
    : "";

  return `<!DOCTYPE html><html><body style="margin:0;background:#090805;padding:20px;font-family:Georgia,serif;">
    <div style="max-width:620px;margin:0 auto;">
      <div style="text-align:center;padding:24px 0 28px;border-bottom:1px solid #1E1A0C;margin-bottom:24px;">
        <div style="font-size:36px;margin-bottom:8px;">♔</div>
        <div style="color:#C4962A;font-size:20px;letter-spacing:0.15em;text-transform:uppercase;font-weight:600;">Mansa Musa · Daily Brief</div>
        <div style="color:#4A3E1E;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-top:6px;">${today}</div>
      </div>
      <div style="color:#C4A84A;font-size:15px;line-height:1.7;margin-bottom:24px;font-style:italic;">
        Captain — ${leads.length} ${leads.length === 1 ? "opportunity" : "opportunities"} ${leads.length === 1 ? "has" : "have"} surfaced. ${totalLine}
      </div>
      ${leadCards}
      <div style="text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid #1E1A0C;color:#3A3015;font-size:11px;letter-spacing:0.1em;">
        The Emperor is watching. Rule well.
      </div>
    </div>
  </body></html>`;
}

async function sendEmail(to: string, from: string, subject: string, html: string, apiKey: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("MANSA_FROM_EMAIL");
    const captainEmail = Deno.env.get("CAPTAIN_EMAIL");
    const userId = Deno.env.get("CAPTAIN_USER_ID");

    if (!resendKey || !fromEmail || !captainEmail || !userId) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY / MANSA_FROM_EMAIL / CAPTAIN_EMAIL / CAPTAIN_USER_ID" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Find unnotified leads from the last 36 hours, score >= 7
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    const { data: leads } = await supabase
      .from("mansa_leads")
      .select("*")
      .eq("user_id", userId)
      .is("notified_at", null)
      .gte("relevance_score", 7)
      .gte("discovered_at", cutoff)
      .order("relevance_score", { ascending: false })
      .limit(10);

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ sent: false, reason: "No new leads to notify" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const html = renderDigestHTML(leads);
    const subject = `⚜ ${leads.length} ${leads.length === 1 ? "opportunity" : "opportunities"} · Mansa Musa brief`;
    await sendEmail(captainEmail, fromEmail, subject, html, resendKey);

    // Mark leads as notified
    await supabase.from("mansa_leads").update({ notified_at: new Date().toISOString() }).in("id", leads.map((l: any) => l.id));

    await supabase.from("mansa_runs").insert({
      user_id: userId, run_type: "notify", status: "success",
      leads_found: leads.length, completed_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ sent: true, count: leads.length }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
