export default function Navbar({ title, subtitle, action }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px 0", marginBottom:20 }}>
      <div>
        <h1 style={{ fontSize:18, fontWeight:500 }}>{title}</h1>
        {subtitle && <p style={{ fontSize:12, color:"#898781", marginTop:2 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
