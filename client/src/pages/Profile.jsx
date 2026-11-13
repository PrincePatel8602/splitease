import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const [form, setForm] = useState({
    name:               user?.name || "",
    phone:              user?.phone || "",
    defaultPaymentMode: user?.defaultPaymentMode || "UPI",
    emailNotifications: user?.emailNotifications || "All expenses",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState(null);

  // Whenever the saved user changes, show the saved values (not defaults)
  useEffect(() => {
    if (!user) return;
    setForm({
      name:               user.name || "",
      phone:              user.phone || "",
      defaultPaymentMode: user.defaultPaymentMode || "UPI",
      emailNotifications: user.emailNotifications || "All expenses",
    });
  }, [user?.name, user?.phone, user?.defaultPaymentMode, user?.emailNotifications]);

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put("/api/auth/me", form);
      updateUser(data);                    // ← keeps the app in sync, so it stays saved
      showToast("Preferences saved ✓");
    } catch (e) {
      showToast(e.response?.data?.error || "Error saving", "error");
    } finally { setSaving(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="page">
      <Navbar title="Profile" subtitle="Account & preferences" />

      <div className="card">
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#4f2fe0,#6fdcf5)", color:"#fff",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:600 }}>{initials}</div>
          <div>
            <div style={{ fontWeight:600, fontSize:16 }}>{user?.name}</div>
            <div style={{ color:"#52514e", fontSize:13 }}>{user?.email}</div>
          </div>
        </div>

        <div style={{ fontSize:13, fontWeight:600, color:"#52514e", margin:"4px 0 12px" }}>Account</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12, marginBottom:18 }}>
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={set("name")} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set("phone")} placeholder="Optional" /></div>
        </div>

        <div style={{ fontSize:13, fontWeight:600, color:"#52514e", marginBottom:12 }}>Preferences</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12, marginBottom:20 }}>
          <div>
            <label className="label">Default payment mode</label>
            <select className="input" value={form.defaultPaymentMode} onChange={set("defaultPaymentMode")}>
              {["UPI","Cash","Bank transfer"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Email notifications</label>
            <select className="input" value={form.emailNotifications} onChange={set("emailNotifications")}>
              {["All expenses","Only settlements","None"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={save} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save preferences"}
          </button>
          <button onClick={logout} style={{ padding:"10px 18px", background:"#fcebeb", color:"#a32d2d", border:"1px solid #e34948", borderRadius:14, fontSize:13, fontWeight:500 }}>
            Sign out
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize:13, fontWeight:600, color:"#52514e", marginBottom:12 }}>About SplitEase</div>
        <div style={{ fontSize:12, color:"#52514e", lineHeight:1.9 }}>
          ✅ Smart debt simplification<br/>
          📧 Email notifications via Gmail SMTP<br/>
          📄 PDF receipts with QR verification<br/>
          🔒 Expense locking after settlement<br/>
          👥 Group roles: Admin / Member / Viewer<br/>
          🤖 AI-powered expense auto-tagging<br/>
          💳 Multi-mode payments: UPI, Cash, Bank transfer
        </div>
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:16, right:16, background: toast.type === "error" ? "#a32d2d" : "#0b0b0b", color:"#fff",
                      padding:"10px 16px", borderRadius:12, fontSize:13, zIndex:200 }}>{toast.msg}</div>
      )}
    </div>
  );
}
