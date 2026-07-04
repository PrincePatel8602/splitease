export default function BalanceCard({ label, amount, sub, color }) {
  return (
    <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:8, padding:12 }}>
      <div style={{ fontSize:11, color:"#898781", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.4px" }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:500, marginTop:4, color: color || "#0b0b0b" }}>₹{amount?.toLocaleString() || "0"}</div>
      {sub && <div style={{ fontSize:11, color:"#898781", marginTop:2 }}>{sub}</div>}
    </div>
  );
}
