import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#4f2fe0", "#6fdcf5", "#1baf7a", "#eda100", "#e87ba4", "#898781", "#e34948"];
const CATS   = ["Food","Travel","Rent","Entertainment","Shopping","Utilities","Other"];

const sel = { background:"rgba(255,255,255,0.8)", border:"none", borderRadius:12, padding:"8px 12px", fontSize:12, outline:"none", flex:1, minWidth:110 };

// Build list of last N month keys like "2026-11"
function lastMonths(n) {
  const out = [], d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export default function SpendingChart({ rows = [], groups = [] }) {
  const [range,    setRange]    = useState(6);
  const [groupId,  setGroupId]  = useState("all");
  const [category, setCategory] = useState("all");
  const [view,     setView]     = useState("bar");   // "bar" (by month) | "donut" (by category)

  const { months, cats, total } = useMemo(() => {
    const keys = lastMonths(range);
    const filtered = rows.filter(r =>
      keys.includes(r.month) &&
      (groupId  === "all" || r.group    === groupId) &&
      (category === "all" || r.category === category)
    );
    const m = Object.fromEntries(keys.map(k => [k, 0]));
    const c = {};
    filtered.forEach(r => {
      m[r.month] += r.total;
      c[r.category] = (c[r.category] || 0) + r.total;
    });
    const catList = Object.entries(c).sort((a, b) => b[1] - a[1]);
    return {
      months: keys.map(k => ({ name: MONTHS[Number(k.slice(5)) - 1], total: m[k] })),
      cats:   catList,
      total:  catList.reduce((s, [, v]) => s + v, 0),
    };
  }, [rows, range, groupId, category]);

  const top = Math.max(...months.map(d => d.total), 0);

  return (
    <div>
      {/* ── Filters ── */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
        <select value={groupId} onChange={e => setGroupId(e.target.value)} style={sel}>
          <option value="all">All groups</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.icon} {g.name}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} style={sel}>
          <option value="all">All categories</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={range} onChange={e => setRange(Number(e.target.value))} style={sel}>
          <option value={1}>This month</option>
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </div>

      {/* ── View switch ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div>
          <div style={{ fontSize:24, fontWeight:600 }}>₹{total.toLocaleString()}</div>
          <div style={{ fontSize:11, color:"#898781" }}>your share in selected period</div>
        </div>
        <div style={{ display:"flex", background:"rgba(255,255,255,0.8)", borderRadius:12, padding:3 }}>
          {[["bar","By month"],["donut","By category"]].map(([k, label]) => (
            <button key={k} onClick={() => setView(k)}
              style={{ border:"none", borderRadius:9, padding:"6px 12px", fontSize:12, fontWeight:500,
                background: view === k ? "#4f2fe0" : "transparent", color: view === k ? "#fff" : "#52514e" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <div style={{ textAlign:"center", padding:30, color:"#898781", fontSize:13 }}>No spending for this filter</div>
      ) : view === "bar" ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={months} margin={{ top:8, right:0, left:0, bottom:0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:11, fill:"#898781" }} />
            <YAxis axisLine={false} tickLine={false} width={44} tick={{ fontSize:11, fill:"#898781" }} />
            <Tooltip formatter={v => `₹${v.toLocaleString()}`} cursor={{ fill:"transparent" }} />
            <Bar dataKey="total" radius={[10,10,10,10]} isAnimationActive={false}>
              {months.map((d, i) => (
                <Cell key={i} fill={d.total === top ? "#4f2fe0" : i === months.length - 1 ? "#6fdcf5" : "#e6e6e6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={cats.map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name"
                 innerRadius={60} outerRadius={95} paddingAngle={3} cornerRadius={8} isAnimationActive={false}>
              {cats.map(([name], i) => <Cell key={name} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
          </PieChart>
        </ResponsiveContainer>
      )}

      {/* ── Category list ── */}
      <div style={{ marginTop:12 }}>
        {cats.map(([name, value], i) => (
          <div key={name} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderTop:"1px solid rgba(0,0,0,0.06)", fontSize:13 }}>
            <span style={{ width:10, height:10, borderRadius:"50%", background:COLORS[i % COLORS.length] }} />
            <span style={{ flex:1 }}>{name}</span>
            <strong>₹{value.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
