import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login      from "./pages/Login";
import Register   from "./pages/Register";
import Dashboard  from "./pages/Dashboard";
import Groups     from "./pages/Groups";
import Expenses   from "./pages/Expenses";
import SettleUp   from "./pages/SettleUp";
import Profile    from "./pages/Profile";
import Navbar     from "./components/Navbar";
import Sidebar    from "./components/Sidebar";

function PrivateLayout() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);   // mobile sidebar open / closed

  // Esc key closes the mobile sidebar
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#52514e"}}>Loading SplitEase…</div>;
  if (!user)   return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className={"sidebar-overlay" + (open ? " open" : "")} onClick={() => setOpen(false)} />
      <div className="app-main">
        {/* top bar with ☰ button — visible only on mobile */}
        <div className="mobile-topbar">
          <button className="hamburger" aria-label="Open menu" onClick={() => setOpen(true)}>☰</button>
          <span style={{ fontWeight:600, color:"#4f2fe0" }}>💸 SplitEase</span>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 👇 default route goes to login */}
        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* protected routes — share ONE layout */}
        <Route element={<PrivateLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/groups"    element={<Groups />} />
          <Route path="/expenses"  element={<Expenses />} />
          <Route path="/settle"    element={<SettleUp />} />
          <Route path="/profile"   element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}