import { useState, useEffect } from "react";

const CATEGORY_COLORS = {
  tax: "#C4962A", investing: "#5A7AAF", real_estate: "#9A5A3A",
  saas: "#4A8C6A", coaching: "#8C5A9A", fitness: "#3A8C8C",
  brand: "#C4554A", gig: "#6A9A5A", content: "#C47A3A",
  grant: "#B8A63A", affiliate: "#8A5ABF", general: "#6B5A3A",
};

const TIMELINE_LABELS = {
  same_week: "This week",
  "2_4_weeks": "2-4 weeks",
  "1_3_months": "1-3 months",
  "3_6_months": "3-6 months",
  "6_plus_months": "6+ months",
};

const INCOME_TYPE_LABELS = {
  active: "Active $",
  passive: "Passive $",
  semi_passive: "Semi-passive $",
  savings: "Tax savings",
  none: "Educational",
};

function formatMoney(n) {
  if (!n || n === 0) return null;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K/mo`;
  return `$${n}/mo`;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SCOUT_ENDPOINT = import.meta.env.VITE_SCOUT_ENDPOINT;

async function supabaseQuery(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  return res.json();
}

async function supabaseUpdate(table, id, updates) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

function LeadCard({ lead, onStatus, onDiscuss }) {
  const color = CATEGORY_COLORS[lead.category] || "#6B5A3A";
  const money = formatMoney(lead.estimated_monthly);
  const timeline = TIMELINE_LABELS[lead.time_to_first_dollar];
  return (
    <div style={{
      background: "#0F0E08", border: "1px solid #1E1A0E", borderRadius: 14,
      padding: 16, marginBottom: 12, animation: "mmFade 0.4s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ background: `${color}22`, color, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 4, fontWeight: 500 }}>
          {lead.category.replace("_", " ")}
        </span>
        <span style={{ color: "#6B5A2A", fontSize: 11 }}>{lead.relevance_score}/10</span>
        <span style={{ color: "#4A3E1E", fontSize: 10, textTransform: "uppercase", marginLeft: "auto" }}>{lead.source}</span>
      </div>

      {(money || timeline) && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {money && (
            <span style={{ background: "#0A0907", border: "1px solid #3A2C0E", color: "#C4962A", fontSize: 11, padding: "4px 9px", borderRadius: 4, fontWeight: 600 }}>
              ⚡ {money}
            </span>
          )}
          {timeline && (
            <span style={{ background: "#0A0907", border: "1px solid #1E1A0E", color: "#8A7A48", fontSize: 11, padding: "4px 9px", borderRadius: 4 }}>
              ⏱ {timeline}
            </span>
          )}
          {lead.effort_hours > 0 && (
            <span style={{ background: "#0A0907", border: "1px solid #1E1A0E", color: "#8A7A48", fontSize: 11, padding: "4px 9px", borderRadius: 4 }}>
              {lead.effort_hours}h effort
            </span>
          )}
        </div>
      )}

      <div style={{ color: "#D4C890", fontSize: 16, fontWeight: 600, marginBottom: 8, lineHeight: 1.35 }}>{lead.title}</div>
      <div style={{ color: "#9A8A58", fontSize: 13.5, lineHeight: 1.6, marginBottom: 10 }}>{lead.summary}</div>
      <div style={{ color: "#C4962A", fontSize: 12.5, fontStyle: "italic", marginBottom: 10, lineHeight: 1.55 }}>⚜ {lead.why_relevant}</div>
      <div style={{ color: "#8A7A48", fontSize: 12.5, marginBottom: 14, lineHeight: 1.55 }}>
        <strong style={{ color: "#C4962A" }}>Next move:</strong> {lead.suggested_action}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => onDiscuss(lead)}
          style={{ background: "#C4962A", border: "none", color: "#09080A", fontSize: 13, padding: "10px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "Georgia, serif", flex: "1 1 auto", minHeight: 40 }}>
          Consult Emperor
        </button>
        {lead.source_url && (
          <a href={lead.source_url} target="_blank" rel="noopener noreferrer"
            style={{ color: "#C4962A", fontSize: 13, textDecoration: "none", padding: "10px 14px", border: "1px solid #3A2C0E", borderRadius: 8, minHeight: 40, display: "flex", alignItems: "center", fontFamily: "Georgia, serif" }}>
            ↗
          </a>
        )}
        {lead.status === "new" && (
          <>
            <button onClick={() => onStatus(lead.id, "interesting")}
              style={{ background: "transparent", border: "1px solid #3A2C0E", color: "#C4962A", fontSize: 13, padding: "10px 14px", borderRadius: 8, cursor: "pointer", minHeight: 40, fontFamily: "Georgia, serif" }}>
              ★
            </button>
            <button onClick={() => onStatus(lead.id, "archived")}
              style={{ background: "transparent", border: "1px solid #201C0E", color: "#4A3E1E", fontSize: 13, padding: "10px 14px", borderRadius: 8, cursor: "pointer", minHeight: 40, fontFamily: "Georgia, serif" }}>
              ×
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function IntelFeed({ onDiscuss }) {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("new");
  const [incomeFilter, setIncomeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [hunting, setHunting] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await supabaseQuery("mansa_leads?select=*&order=relevance_score.desc,discovered_at.desc&limit=50");
    let filtered = Array.isArray(data) ? data.filter(l => l.status === filter) : [];
    if (incomeFilter === "quick") {
      filtered = filtered.filter(l => ["same_week", "2_4_weeks"].includes(l.time_to_first_dollar));
    } else if (incomeFilter === "build") {
      filtered = filtered.filter(l => ["passive", "semi_passive"].includes(l.income_type));
    } else if (incomeFilter === "active") {
      filtered = filtered.filter(l => l.income_type === "active");
    }
    setLeads(filtered);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, incomeFilter]);

  const updateStatus = async (id, status) => {
    await supabaseUpdate("mansa_leads", id, { status });
    load();
  };

  const runHuntNow = async () => {
    if (hunting) return;
    setHunting(true);
    try {
      await fetch(SCOUT_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      await new Promise(r => setTimeout(r, 1500));
      await load();
    } catch (_) {}
    setHunting(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#09080A" }}>
      <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #181408", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 4, flex: 1, overflowX: "auto" }}>
            {[
              { id: "new", label: "New" },
              { id: "interesting", label: "★ Saved" },
              { id: "archived", label: "Archive" },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                style={{
                  background: filter === f.id ? "#1A1608" : "transparent",
                  border: `1px solid ${filter === f.id ? "#3A2C0E" : "#1A1608"}`,
                  color: filter === f.id ? "#C4962A" : "#6B5A2A",
                  fontSize: 12.5, padding: "7px 14px", borderRadius: 18, cursor: "pointer",
                  fontFamily: "Georgia, serif", whiteSpace: "nowrap", minHeight: 34,
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={runHuntNow} disabled={hunting}
            style={{
              background: hunting ? "#141108" : "#C4962A", border: "1px solid #2A2010", borderRadius: 18,
              padding: "7px 14px", color: hunting ? "#3A3015" : "#09080A", fontSize: 12.5,
              cursor: hunting ? "wait" : "pointer", fontWeight: 600, fontFamily: "Georgia, serif",
              whiteSpace: "nowrap", minHeight: 34,
            }}>
            {hunting ? "..." : "⚜ Hunt"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
          {[
            { id: "all", label: "All income", icon: "◇" },
            { id: "quick", label: "Quick cash", icon: "⚡" },
            { id: "active", label: "Active", icon: "◉" },
            { id: "build", label: "Passive build", icon: "⬡" },
          ].map(f => (
            <button key={f.id} onClick={() => setIncomeFilter(f.id)}
              style={{
                background: incomeFilter === f.id ? "#13110A" : "transparent",
                border: `1px solid ${incomeFilter === f.id ? "#2A2010" : "#141008"}`,
                color: incomeFilter === f.id ? "#C4962A" : "#4A3E1E",
                fontSize: 11, padding: "5px 10px", borderRadius: 14, cursor: "pointer",
                fontFamily: "Georgia, serif", whiteSpace: "nowrap", display: "flex", gap: 4, alignItems: "center",
              }}>
              <span style={{ fontSize: 10 }}>{f.icon}</span>{f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 20px", WebkitOverflowScrolling: "touch" }}>
        {loading && <div style={{ textAlign: "center", color: "#4A3E1E", padding: "2rem", fontStyle: "italic" }}>Loading intel...</div>}
        {!loading && leads.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>⚜</div>
            <div style={{ fontSize: 16, color: "#C4962A", marginBottom: 8 }}>The scouts are quiet</div>
            <div style={{ fontSize: 13, color: "#4A3E1E", lineHeight: 1.7, maxWidth: 300, margin: "0 auto" }}>
              No intel here yet. Hit Hunt or wait for the scheduled run.
            </div>
          </div>
        )}
        {!loading && leads.map(lead => <LeadCard key={lead.id} lead={lead} onStatus={updateStatus} onDiscuss={onDiscuss} />)}
      </div>
    </div>
  );
}
