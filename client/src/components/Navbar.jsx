export default function Navbar({ title, subtitle, action }) {
  return (
    <div className="navbar">
      <div>
        <h1 style={{ fontSize:18, fontWeight:600 }}>{title}</h1>
        {subtitle && <p style={{ fontSize:12, color:"#52514e", marginTop:2 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}