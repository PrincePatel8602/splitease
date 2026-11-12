export default function BalanceCard({ label, amount, sub, color }) {
  return (
    <div className="card" style={{ marginBottom:0 }}>
      <div style={{ fontSize:11, color:"#898781", fontWeight:500, textTransform:"uppercase", letterSpacing:"0.4px" }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:600, marginTop:4, color: color || "#0b0b0b" }}>₹{amount?.toLocaleString() || "0"}</div>
      {sub && <div style={{ fontSize:11, color:"#898781", marginTop:2 }}>{sub}</div>}
    </div>
  );
}
