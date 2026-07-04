import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await register(form.name, form.email, form.password); navigate("/"); }
    catch (err) { setError(err.response?.data?.error || "Registration failed"); }
    finally { setLoading(false); }
  };

  const inp = (field) => ({ value: form[field], onChange: e => setForm({...form, [field]: e.target.value}), required: true,
    style:{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" } });

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f8f7f4" }}>
      <div style={{ background:"#fff", borderRadius:12, padding:32, width:360, border:"0.5px solid rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:28, marginBottom:4 }}>💸</div>
          <h1 style={{ fontSize:20, fontWeight:500 }}>Create account</h1>
          <p style={{ color:"#898781", fontSize:13, marginTop:4 }}>Start splitting expenses</p>
        </div>
        {error && <div style={{ background:"#fcebeb", color:"#a32d2d", padding:10, borderRadius:8, fontSize:13, marginBottom:14 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          {[["Name","name","text","Arjun Kumar"],["Email","email","email","you@example.com"],["Password","password","password","••••••••"]].map(([label,field,type,ph]) => (
            <div key={field} style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>{label}</label>
              <input type={type} placeholder={ph} {...inp(field)} />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{ width:"100%", padding:10, background:"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500, marginTop:6 }}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:"#898781" }}>
          Have an account? <Link to="/login" style={{ color:"#2a78d6" }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
