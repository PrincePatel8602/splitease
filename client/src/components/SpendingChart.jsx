import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COLORS = ["#4f2fe0", "#6fdcf5", "#1baf7a", "#eda100", "#e87ba4", "#898781", "#e34948"];

export default function SpendingChart({ rows = [] }) {
  const { months, cats } = useMemo(() => {
    const m = {}, c = {};
    rows.forEach(r => {
      m[r.month] = (m[r.month] || 0) + r.total;
      c[r.category] = (c[r.category] || 0) + r.total;
    });
    return {
      months: Object.entries(m).map(([k, total]) => ({ name: MONTHS[Number(k.slice(5)) - 1], total })),
      cats: Object.entries(c).sort((a, b) => b[1] - a[1]),
    };
  }, [rows]);

  if (!months.length)
    return <div style={{ textAlign:"center", padding:30, color:"#898781", fontSize:13 }}>No spending data yet</div>;

  const top = Math.max(...months.map(d => d.total));

  return (
    <div>
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

      <div style={{ marginTop:12 }}>
        {cats.map(([name, total], i) => (
          <div key={name} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderTop:"1px solid rgba(0,0,0,0.06)", fontSize:13 }}>
            <span style={{ width:10, height:10, borderRadius:"50%", background:COLORS[i % COLORS.length] }} />
            <span style={{ flex:1 }}>{name}</span>
            <strong>₹{total.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
