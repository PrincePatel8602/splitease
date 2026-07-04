import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function Profile() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ defaultPaymentMode: user?.defaultPaymentMode||"UPI", emailNotifications: user?.emailNotifications||"All expenses" });
  const [toast, setToast] = useState("");

  const save = async () => {
    try { await axios.put("/api/auth/me", form); setToast("Saved ✓"); setTimeout(()=>setToast(""),2000); }
    catch { setToast("Error saving"); setTimeout(()=>setToast(""),2000); }
  };

  return (
    <div style={{ padding:24 }}>
      <Navbar title="Profile" subtitle="Account & preferences" />

      <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:12, padding:20, marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:"#e6f1fb", color:"#185fa5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:500 }}>
            {user?.name?.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight:500, fontSize:15 }}>{user?.name}</div>
            <div style={{ color:"#898781", fontSize:13 }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ height:"0.5px", background:"rgba(0,0,0,0.1)", margin:"0 0 16px" }} />

        <div style={{ fontSize:13, fontWeight:500, color:"#52514e", marginBottom:12 }}>Preferences</div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Default payment mode</div>
          <select value={form.defaultPaymentMode} onChange={e=>setForm(f=>({...f,defaultPaymentMode:e.target.value}))}
            style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }}>
            {["UPI","Cash","Bank transfer"].map(m=><option key={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Email notifications</div>
          <select value={form.emailNotifications} onChange={e=>setForm(f=>({...f,emailNotifications:e.target.value}))}
            style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }}>
            {["All expenses","Only settlements","None"].map(m=><option key={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={save} style={{ padding:"7px 14px", background:"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>Save preferences</button>
          <button onClick={logout} style={{ padding:"7px 14px", background:"#fcebeb", color:"#a32d2d", border:"0.5px solid #e34948", borderRadius:8, fontSize:13, cursor:"pointer" }}>Sign out</button>
        </div>
      </div>

      <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:12, padding:20 }}>
        <div style={{ fontSize:13, fontWeight:500, color:"#52514e", marginBottom:12 }}>About SplitEase</div>
        <div style={{ fontSize:12, color:"#898781", lineHeight:1.8 }}>
          ✅ Smart debt simplification (graph optimization)<br/>
          📧 Email notifications via Gmail SMTP<br/>
          📄 PDF receipts with QR verification<br/>
          🔒 Expense locking after settlement<br/>
          👥 Group roles: Admin / Member / Viewer<br/>
          🤖 AI-powered expense auto-tagging<br/>
          💳 Multi-mode payments: UPI, Cash, Bank transfer
        </div>
      </div>

      {toast && <div style={{ position:"fixed", bottom:16, right:16, background:"#0b0b0b", color:"#fff", padding:"10px 16px", borderRadius:8, fontSize:13, zIndex:200 }}>{toast}</div>}
    </div>
  );
}
