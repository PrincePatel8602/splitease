import { useState } from "react";

// Shared layout for Login + Register
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div className="card" style={{ width:"100%", maxWidth:400, padding:"36px 32px", borderRadius:28, marginBottom:0 }}>
        <div style={{ textAlign:"center", marginBottom:26 }}>
          <div style={{ width:60, height:60, margin:"0 auto 14px", borderRadius:20, background:"linear-gradient(135deg,#4f2fe0,#6fdcf5)",
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, boxShadow:"0 8px 20px rgba(79,47,224,0.3)" }}>💸</div>
          <h1 style={{ fontSize:22, fontWeight:600 }}>{title}</h1>
          <p style={{ color:"#52514e", fontSize:13, marginTop:4 }}>{subtitle}</p>
        </div>
        {children}
        <p style={{ textAlign:"center", marginTop:20, fontSize:13, color:"#52514e" }}>{footer}</p>
      </div>
    </div>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return <div style={{ background:"#fcebeb", color:"#a32d2d", padding:"10px 14px", borderRadius:12, fontSize:13, marginBottom:14 }}>{children}</div>;
}

// Password input with show / hide button
export function PasswordField({ value, onChange, placeholder = "••••••••", minLength }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <input className="input" type={show ? "text" : "password"} value={value} onChange={onChange}
             required minLength={minLength} placeholder={placeholder} style={{ paddingRight:60 }} />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", fontSize:12, color:"#4f2fe0", fontWeight:500 }}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
