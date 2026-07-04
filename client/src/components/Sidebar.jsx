import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to:"/",        label:"Dashboard",     icon:"📊" },
  { to:"/groups",  label:"Groups",        icon:"👥" },
  { to:"/expenses",label:"Expenses",      icon:"🧾" },
  { to:"/settle",  label:"Settle Up",     icon:"⚡" },
  { to:"/profile", label:"Profile",       icon:"👤" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside style={{ width:220, background:"#fff", borderRight:"0.5px solid rgba(0,0,0,0.1)", display:"flex", flexDirection:"column", flexShrink:0 }}>
      <div style={{ padding:16, borderBottom:"0.5px solid rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize:16, fontWeight:500, color:"#2a78d6" }}>💸 SplitEase</div>
        <div style={{ fontSize:11, color:"#898781", marginTop:2 }}>Smart expense splitting</div>
      </div>
      <nav style={{ flex:1, padding:"8px 0" }}>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to==="/"} style={({ isActive }) => ({
            display:"flex", alignItems:"center", gap:8, padding:"8px 16px",
            color: isActive ? "#2a78d6" : "#52514e",
            background: isActive ? "#e6f1fb" : "transparent",
            borderLeft: isActive ? "2px solid #2a78d6" : "2px solid transparent",
            fontWeight: isActive ? 500 : 400, fontSize:13, transition:"all 0.15s"
          })}>
            <span>{l.icon}</span>{l.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding:12, borderTop:"0.5px solid rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize:12, color:"#52514e", marginBottom:6 }}>👤 {user?.name}</div>
        <button onClick={logout} style={{ fontSize:12, color:"#a32d2d", background:"none", border:"none", cursor:"pointer", padding:0 }}>Sign out</button>
      </div>
    </aside>
  );
}
