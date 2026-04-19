import { useState } from "react";

const STOCK_COLORS = {
  VOO: "#C4962A", VTI: "#4A8C6A", MSFT: "#5A7AAF",
  NVDA: "#76B041", AMZN: "#C4762A", HOOD: "#9A5A9A",
  UBER: "#4A8C8C", NFLX: "#C43A3A",
};

function NumField({ label, value, onChange, step = "1000", prefix = "$" }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: "#4A3E1E", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", background: "#0E0D09", border: "1px solid #201C0E", borderRadius: 8, overflow: "hidden" }}>
        <span style={{ padding: "0 10px", color: "#6A5A2A", fontSize: 13 }}>{prefix}</span>
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          step={step}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "#C4A84A", fontSize: 14, padding: "10px 10px 10px 0",
            fontFamily: "Georgia, serif",
          }}
        />
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "#3A3015", letterSpacing: "0.22em", textTransform: "uppercase" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "#C4962A" }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function fmt(n) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(2)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function PortfolioEdit({ portfolio, prices, pricesUpdated, onSave, onClose }) {
  const [data, setData] = useState(portfolio);

  const set = (key, val) => setData(d => ({ ...d, [key]: val }));
  const setStock = (ticker, field, val) =>
    setData(d => ({ ...d, stocks: { ...d.stocks, [ticker]: { ...d.stocks[ticker], [field]: val } } }));

  const stockMarketValue = Object.entries(data.stocks).reduce((sum, [ticker, s]) => {
    return sum + s.shares * (prices[ticker] || s.avgCost);
  }, 0);

  const netWorth = data.k401 + stockMarketValue + data.cash + data.realEstate
    + data.iBonds + data.gold + data.crypto + data.other;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#09080A", zIndex: 100,
      display: "flex", flexDirection: "column", fontFamily: "Georgia, serif",
      paddingTop: "env(safe-area-inset-top)",
      paddingBottom: "env(safe-area-inset-bottom)",
      overflowY: "hidden",
    }}>
      {/* Header */}
      <div style={{
        background: "#0C0B07", borderBottom: "1px solid #1E1A0C",
        padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#C4962A", fontSize: 20, cursor: "pointer", padding: "0 8px 0 0" }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#C4962A", letterSpacing: "0.1em", textTransform: "uppercase" }}>Portfolio Editor</div>
          <div style={{ fontSize: 9.5, color: "#4A3E1E", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 1 }}>
            {pricesUpdated ? `Prices as of ${new Date(pricesUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Prices loading…"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#C4962A" }}>{fmt(netWorth)}</div>
          <div style={{ fontSize: 9, color: "#4A3E1E", letterSpacing: "0.08em" }}>LIVE NET WORTH</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 14px", WebkitOverflowScrolling: "touch" }}>

        {/* Retirement */}
        <Section title="Retirement">
          <NumField label="401k / Retirement Value" value={data.k401} onChange={v => set("k401", v)} />
        </Section>

        {/* Brokerage */}
        <Section title="Brokerage" subtitle={fmt(stockMarketValue + data.cash)}>
          <NumField label="Cash / Money Market (VMFXX)" value={data.cash} onChange={v => set("cash", v)} />

          <div style={{ marginTop: 14, marginBottom: 8, fontSize: 10, color: "#4A3E1E", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            Equities — live market prices
          </div>

          {Object.entries(data.stocks).map(([ticker, s]) => {
            const livePrice = prices[ticker];
            const price = livePrice || s.avgCost;
            const mktVal = s.shares * price;
            const costBasis = s.shares * s.avgCost;
            const gainAmt = mktVal - costBasis;
            const gainPct = ((gainAmt / costBasis) * 100);
            const isGain = gainAmt >= 0;

            return (
              <div key={ticker} style={{
                background: "#0E0D09", border: "1px solid #201C0E",
                borderRadius: 10, padding: "12px", marginBottom: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: STOCK_COLORS[ticker] || "#C4962A", fontWeight: 700, fontSize: 15 }}>{ticker}</span>
                    {livePrice && (
                      <span style={{
                        fontSize: 11, color: isGain ? "#4A8C6A" : "#C43A3A",
                        background: isGain ? "#0A1A0F" : "#1A0A0A",
                        padding: "2px 6px", borderRadius: 4,
                      }}>
                        {isGain ? "+" : ""}{gainPct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, color: "#C4A84A", fontWeight: 600 }}>{fmt(mktVal)}</div>
                    <div style={{ fontSize: 10, color: isGain ? "#4A8C6A" : "#C43A3A" }}>
                      {isGain ? "+" : ""}{fmt(Math.abs(gainAmt))} P&L
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: "#4A3E1E", letterSpacing: "0.12em", marginBottom: 3 }}>SHARES</div>
                    <input type="number" value={s.shares} step="0.01"
                      onChange={e => setStock(ticker, "shares", Number(e.target.value))}
                      style={{
                        width: "100%", background: "#13110A", border: "1px solid #1E1A0E",
                        borderRadius: 6, color: "#C4A84A", fontSize: 13,
                        padding: "7px 8px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box",
                      }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: "#4A3E1E", letterSpacing: "0.12em", marginBottom: 3 }}>AVG COST</div>
                    <input type="number" value={s.avgCost} step="0.01"
                      onChange={e => setStock(ticker, "avgCost", Number(e.target.value))}
                      style={{
                        width: "100%", background: "#13110A", border: "1px solid #1E1A0E",
                        borderRadius: 6, color: "#C4A84A", fontSize: 13,
                        padding: "7px 8px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box",
                      }} />
                  </div>
                  <div style={{ minWidth: 64, textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: "#4A3E1E", letterSpacing: "0.12em", marginBottom: 3 }}>LIVE PRICE</div>
                    <div style={{ fontSize: 13, color: livePrice ? "#C4A84A" : "#3A3015", padding: "7px 0" }}>
                      {livePrice ? `$${livePrice.toFixed(2)}` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Section>

        {/* Real Estate */}
        <Section title="Real Estate">
          <NumField label="Total Equity (all properties)" value={data.realEstate} onChange={v => set("realEstate", v)} />
        </Section>

        {/* Other Assets */}
        <Section title="Other Assets">
          <NumField label="I-Bonds" value={data.iBonds} onChange={v => set("iBonds", v)} />
          <NumField label="Gold (current value)" value={data.gold} onChange={v => set("gold", v)} />
          <NumField label="Crypto (ETH etc)" value={data.crypto} onChange={v => set("crypto", v)} />
          <NumField label="Other" value={data.other} onChange={v => set("other", v)} />
        </Section>

        {/* Income */}
        <Section title="Passive Income">
          <NumField label="Passive / Month" value={data.passiveMonthly} onChange={v => set("passiveMonthly", v)} step="100" />
        </Section>

      </div>

      {/* Save */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid #181408", background: "#0A0907", flexShrink: 0 }}>
        <button onClick={() => { onSave(data); onClose(); }} style={{
          width: "100%", padding: "14px", background: "#C4962A", border: "none",
          borderRadius: 12, color: "#09080A", fontSize: 15, fontWeight: 700,
          fontFamily: "Georgia, serif", letterSpacing: "0.08em", cursor: "pointer",
        }}>
          Save Portfolio
        </button>
      </div>
    </div>
  );
}
