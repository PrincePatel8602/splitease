import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell, { ErrorBox, PasswordField } from "../components/AuthShell";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();

  // Already logged in → go straight to the dashboard
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);       // user is set → <Navigate> above redirects
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to SplitEase"
      footer={<>No account? <Link to="/register" style={{ color:"#4f2fe0", fontWeight:500 }}>Create one</Link></>}>
      <ErrorBox>{error}</ErrorBox>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom:14 }}>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
        </div>
        <div style={{ marginBottom:20 }}>
          <label className="label">Password</label>
          <PasswordField value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="btn-primary"
          style={{ width:"100%", padding:13, fontSize:15, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
