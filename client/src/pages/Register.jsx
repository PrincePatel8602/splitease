import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell, { ErrorBox, PasswordField } from "../components/AuthShell";

export default function Register() {
  const [form, setForm] = useState({ name:"", email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, register } = useAuth();

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);   // then redirected to dashboard
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Start splitting expenses with friends"
      footer={<>Already have an account? <Link to="/login" style={{ color:"#4f2fe0", fontWeight:500 }}>Sign in</Link></>}>
      <ErrorBox>{error}</ErrorBox>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom:14 }}>
          <label className="label">Full name</label>
          <input className="input" type="text" value={form.name} onChange={set("name")} required placeholder="Arjun Kumar" />
        </div>
        <div style={{ marginBottom:14 }}>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={set("email")} required placeholder="you@example.com" />
        </div>
        <div style={{ marginBottom:20 }}>
          <label className="label">Password</label>
          <PasswordField value={form.password} onChange={set("password")} minLength={6} />
          <div style={{ fontSize:11, color:"#898781", marginTop:5 }}>At least 6 characters</div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary"
          style={{ width:"100%", padding:13, fontSize:15, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
