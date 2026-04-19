import { useState, useRef, useEffect } from "react";
import IntelFeed from "./components/IntelFeed.jsx";

const ENDPOINT = import.meta.env.VITE_MANSA_ENDPOINT;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

const QUICK_PROMPTS = [
  { label: "Quick Cash", icon: "⚡", color: "#D4A830", prompt: "Find me $500-2000 I can earn in the next 14 days. Search current gigs, contracts, grants with deadlines, and one-off opportunities that match my React/TypeScript/Supabase + financial coaching + former pro athlete skill set. Be specific — name platforms, link where possible, and rank by realistic speed-to-first-dollar." },
  { label: "Build Income", icon: "⬡", color: "#4A8C6A", prompt: "Search for semi-passive and passive income plays I can build in 30-90 days using my existing platforms (Foundation Forward users, BrandLenz MVP, personal brand, tech stack). Prioritize compounding bets over one-time gigs." },
  { label: "Tax Moves", icon: "◈", color: "#C4962A", prompt: "What are the most impactful tax moves I should execute right now — W-2, Captain Enterprises LLC, and real estate — to minimize 2026 tax liability? Search current IRS rules." },
  { label: "Vibe Code Idea", icon: "◉", color: "#8C5A9A", prompt: "Search for underserved SaaS micro-tool opportunities I can build in 2-4 weeks using React, Supabase, and AI APIs. Real gaps with clear monetization paths." },
  { label: "Investment Intel", icon: "◆", color: "#5A7AAF", prompt: "Given my holdings (VOO, VTI, MSFT, NVDA, AMZN, HOOD, UBER, NFLX) and $74K idle cash, what should I do right now? Search current market conditions." },
  { label: "Coaching Play", icon: "◎", color: "#C47A3A", prompt: "How do I productize financial + fitness coaching through Captain Enterprises to generate $2-5K/month? Search what's working in the coaching market right now." },
  { label: "Real Estate", icon: "⬟", color: "#9A5A3A", prompt: "Based on my 3 properties and equity, what's my next move? Search FL and GA markets, rate trends, and BRRRR or STR opportunities." },
  { label: "Grants & Pitches", icon: "◇", color: "#B8A63A", prompt: "Find open grants, pitch competitions, and accelerator programs I qualify for right now. Prioritize: Black founders, HBCU alumni, fintech/AI, Florida/Georgia based, under 3-year-old businesses. List deadlines and award amounts." },
];

const PORTFOLIO = [
  ["401k", "$184K", "#C4962A"],
  ["Brokerage", "$132K", "#4A8C6A"],
  ["Real Estate", "$274K", "#5A7AAF"],
  ["Passive/mo", "$1,546", "#8C5A9A"],
];

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#C4962A", animation: `mmDot 1.3s ease ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexDirection: isUser ? "row-reverse" : "row", animation: "mmFade 0.3s ease" }}>
      {!isUser && (
        <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #C4962A 0%, #6B4E12 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#0A0905", fontWeight: "bold", border: "1px solid #3A2E14" }}>M</div>
      )}
      <div style={{
        maxWidth: isUser ? "82%" : "85%", background: isUser ? "#13110A" : "#0F0E08",
        border: `1px solid ${isUser ? "#2C2416" : "#1E1A0E"}`,
        borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
        padding: "11px 14px", fontSize: 14.5, lineHeight: 1.65,
        color: isUser ? "#BBA85E" : "#D4C890", whiteSpace: "pre-wrap",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}>
        {msg.image && <img src={msg.image} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8, border: "1px solid #2C2416" }} />}
        {msg.content}
      </div>
    </div>
  );
}

function ChatView({ seedMessage, onClearSeed }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    if (seedMessage) { sendMessage(seedMessage); onClearSeed(); }
    // eslint-disable-next-line
  }, [seedMessage]);

  const callAPI = async (conversationMessages) => {
    const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: conversationMessages }) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Images only, Captain.");
    const b64 = await fileToBase64(file);
    setPendingImage({ data: b64, mediaType: file.type, preview: `data:${file.type};base64,${b64}` });
  };

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if ((!userText && !pendingImage) || loading) return;

    const userContent = [];
    if (pendingImage) userContent.push({ type: "image", source: { type: "base64", media_type: pendingImage.mediaType, data: pendingImage.data } });
    if (userText) userContent.push({ type: "text", text: userText });

    const userMsg = {
      role: "user",
      content: userContent.length === 1 && userContent[0].type === "text" ? userText : userContent,
      image: pendingImage?.preview,
      displayText: userText,
    };

    setInput("");
    setPendingImage(null);
    const displayMessages = [...messages, userMsg];
    setMessages(displayMessages);
    setLoading(true);

    const apiMessages = displayMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      let data = await callAPI(apiMessages);
      let allContent = data.content || [];
      let currentMessages = [...apiMessages, { role: "assistant", content: allContent }];
      let rounds = 0;
      while (data.stop_reason === "tool_use" && rounds < 4) {
        const toolResults = allContent.filter(b => b.type === "tool_use" || b.type === "server_tool_use").map(b => ({ type: "tool_result", tool_use_id: b.id, content: "Search completed." }));
        if (toolResults.length === 0) break;
        currentMessages = [...currentMessages, { role: "user", content: toolResults }];
        data = await callAPI(currentMessages);
        allContent = [...allContent, ...(data.content || [])];
        currentMessages = [...currentMessages, { role: "assistant", content: data.content || [] }];
        rounds++;
      }
      const fullText = allContent.filter(b => b.type === "text").map(b => b.text).join("").trim() || "The treasury lines are quiet.";
      setMessages([...displayMessages, { role: "assistant", content: fullText }]);
    } catch (err) {
      setMessages([...displayMessages, { role: "assistant", content: `Treasury connection faltered: ${err.message}` }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 768) { e.preventDefault(); sendMessage(); } };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#09080A" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 14px", WebkitOverflowScrolling: "touch" }}>
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem 1rem", animation: "mmFade 0.6s ease" }}>
            <div style={{ fontSize: 46, marginBottom: 10 }}>♔</div>
            <div style={{ fontSize: 20, color: "#C4962A", letterSpacing: "0.08em", marginBottom: 8, fontWeight: 600 }}>The Emperor Awaits</div>
            <div style={{ fontSize: 13.5, color: "#4A3E1E", lineHeight: 1.75, maxWidth: 320, margin: "0 auto 20px" }}>
              Your portfolio, skills, and gaps — known. What do you command?
            </div>
          </div>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} msg={{ ...msg, content: msg.displayText !== undefined ? msg.displayText : msg.content }} />)}
        {loading && (
          <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #C4962A, #6B4E12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#09080A", fontWeight: "bold", flexShrink: 0, border: "1px solid #3A2E14" }}>M</div>
            <div style={{ background: "#0F0E08", border: "1px solid #1E1A0E", borderRadius: "4px 14px 14px 14px", padding: "12px 16px" }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: "1px solid #181408", padding: "10px 12px", background: "#0A0907", flexShrink: 0 }}>
        {pendingImage && (
          <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, background: "#0E0D09", padding: 6, borderRadius: 8, border: "1px solid #201C0E" }}>
            <img src={pendingImage.preview} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6 }} />
            <span style={{ fontSize: 11, color: "#8A7A48", flex: 1 }}>Image attached</span>
            <button onClick={() => setPendingImage(null)} style={{ background: "transparent", border: "none", color: "#6B5A2A", cursor: "pointer", fontSize: 20, padding: "0 8px" }}>×</button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()}
            style={{ width: 42, height: 42, flexShrink: 0, background: "#0E0D09", border: "1px solid #201C0E", borderRadius: 10, cursor: "pointer", color: "#8A7A48", fontSize: 18 }}>📎</button>
          <textarea ref={textareaRef} className="mm-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Command..." rows={1}
            style={{ flex: 1, background: "#0E0D09", border: "1px solid #201C0E", borderRadius: 10, padding: "11px 14px", color: "#C4A84A", fontSize: 15, fontFamily: "Georgia, serif", lineHeight: 1.5, resize: "none", maxHeight: 120, minHeight: 42 }} />
          <button className="mm-send" onClick={() => sendMessage()} disabled={loading || (!input.trim() && !pendingImage)}
            style={{
              width: 42, height: 42, flexShrink: 0,
              background: loading || (!input.trim() && !pendingImage) ? "#141108" : "#C4962A",
              border: "1px solid #2A2010", borderRadius: 10,
              color: loading || (!input.trim() && !pendingImage) ? "#3A3015" : "#09080A",
              fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "sans-serif", fontWeight: 600, cursor: loading ? "wait" : "pointer",
            }}>→</button>
        </div>
      </div>
    </div>
  );
}

function DeckView({ onPick, portfolio }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", background: "#09080A", WebkitOverflowScrolling: "touch" }}>
      <div style={{ fontSize: 11, color: "#3A3015", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 12, paddingLeft: 2 }}>Command Deck</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {QUICK_PROMPTS.map((q, i) => (
          <button key={i} onClick={() => onPick(q.prompt)}
            style={{
              background: "#0F0E08", border: "1px solid #1E1A0E", borderRadius: 12,
              padding: "14px 12px", cursor: "pointer", textAlign: "left",
              color: "#C4A84A", fontFamily: "Georgia, serif",
              display: "flex", flexDirection: "column", gap: 8, minHeight: 90,
            }}>
            <span style={{ color: q.color, fontSize: 22 }}>{q.icon}</span>
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{q.label}</span>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#3A3015", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 12, paddingLeft: 2 }}>Portfolio</div>
      <div style={{ background: "#0F0E08", border: "1px solid #1E1A0E", borderRadius: 12, overflow: "hidden" }}>
        {PORTFOLIO.map(([k, v, c], i) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: i < PORTFOLIO.length - 1 ? "1px solid #181408" : "none" }}>
            <span style={{ fontSize: 13, color: "#8A7A48" }}>{k}</span>
            <span style={{ fontSize: 15, color: c, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: "14px 16px", background: "#0F0E08", border: "1px solid #1E1A0E", borderRadius: 12 }}>
        <div style={{ fontSize: 11, color: "#3A3015", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Total Net Worth</div>
        <div style={{ fontSize: 28, color: "#C4962A", fontWeight: 700 }}>$613K</div>
        <div style={{ fontSize: 11, color: "#4A3E1E", marginTop: 4 }}>Top 15-18% · Age 35-44</div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("chat");
  const [newCount, setNewCount] = useState(0);
  const [seedMessage, setSeedMessage] = useState(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/mansa_leads?select=id&status=eq.new`, {
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, Prefer: "count=exact" },
        });
        const countHeader = res.headers.get("content-range");
        setNewCount(countHeader ? parseInt(countHeader.split("/")[1]) : 0);
      } catch (_) {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [tab]);

  const discussLead = (lead) => {
    const prompt = `Discuss this opportunity you surfaced: "${lead.title}". Summary: ${lead.summary}. Why flagged: ${lead.why_relevant}. Suggested action: ${lead.suggested_action}. Source: ${lead.source_url || "N/A"}. Full strategic analysis — should I act, how, realistic ROI given my situation?`;
    setSeedMessage(prompt);
    setTab("chat");
  };

  const pickPrompt = (prompt) => {
    setSeedMessage(prompt);
    setTab("chat");
  };

  return (
    <div style={{
      height: "100%", background: "#090805", color: "#D4C890",
      display: "flex", flexDirection: "column", fontFamily: "Georgia, serif", overflow: "hidden",
      paddingTop: "env(safe-area-inset-top)",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <style>{`
        @keyframes mmDot { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
        @keyframes mmFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mmPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        .mm-input:focus { outline: none; border-color: #C4962A !important; }
        .mm-tab-btn:active { background: #13110A !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #2A2010; border-radius: 2px; }
      `}</style>

      <header style={{
        background: "#0C0B07", borderBottom: "1px solid #1E1A0C",
        padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #C4962A 0%, #5E3D08 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: "bold", color: "#09080A", border: "1.5px solid #3A2C0E" }}>M</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#C4962A", letterSpacing: "0.1em", textTransform: "uppercase" }}>Mansa Musa</div>
          <div style={{ fontSize: 9.5, color: "#4A3E1E", letterSpacing: "0.16em", textTransform: "uppercase", marginTop: 1 }}>Sovereign Strategist</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#C4962A" }}>$613K</div>
          <div style={{ fontSize: 9, color: "#4A3E1E", letterSpacing: "0.08em" }}>NET WORTH</div>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
        {tab === "chat" && <ChatView seedMessage={seedMessage} onClearSeed={() => setSeedMessage(null)} />}
        {tab === "feed" && <IntelFeed onDiscuss={discussLead} />}
        {tab === "deck" && <DeckView onPick={pickPrompt} />}
      </div>

      {/* Bottom tab bar */}
      <nav style={{
        display: "flex", background: "#0C0B07", borderTop: "1px solid #1E1A0C", flexShrink: 0,
      }}>
        {[
          { id: "chat", label: "Audience", icon: "♔" },
          { id: "feed", label: "Intel", icon: "⚜", badge: newCount },
          { id: "deck", label: "Deck", icon: "◈" },
        ].map(t => (
          <button key={t.id} className="mm-tab-btn" onClick={() => setTab(t.id)}
            style={{
              flex: 1, background: "transparent", border: "none",
              padding: "10px 4px 12px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: tab === t.id ? "#C4962A" : "#4A3E1E",
              fontFamily: "Georgia, serif",
              position: "relative", transition: "color 0.15s",
            }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t.label}</span>
            {t.badge > 0 && (
              <span style={{
                position: "absolute", top: 4, right: "30%",
                background: "#C4962A", color: "#09080A",
                fontSize: 9, fontWeight: 700,
                padding: "1px 5px", borderRadius: 8,
                animation: "mmPulse 2s infinite", minWidth: 14, textAlign: "center",
              }}>{t.badge}</span>
            )}
            {tab === t.id && (
              <span style={{
                position: "absolute", top: 0, left: "30%", right: "30%",
                height: 2, background: "#C4962A", borderRadius: "0 0 2px 2px",
              }} />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
