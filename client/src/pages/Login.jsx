import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, password); navigate("/dashboard"); }
    catch (err) { setError(err.response?.data?.error || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f8f7f4" }}>
      <div style={{ background:"#fff", borderRadius:12, padding:32, width:360, border:"0.5px solid rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:28, marginBottom:4 }}>💸</div>
          <h1 style={{ fontSize:20, fontWeight:500 }}>SplitEase</h1>
          <p style={{ color:"#898781", fontSize:13, marginTop:4 }}>Sign in to your account</p>
        </div>
        {error && <div style={{ background:"#fcebeb", color:"#a32d2d", padding:10, borderRadius:8, fontSize:13, marginBottom:14 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
              style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
          </div>
          <button type="submit" disabled={loading} style={{ width:"100%", padding:10, background:"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:500 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:"#898781" }}>
          No account? <Link to="/register" style={{ color:"#2a78d6" }}>Register</Link>
        </p>
      </div>
    </div>
  );
}
