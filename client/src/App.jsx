import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

function PrivateLayout({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#898781"}}>Loading SplitEase…</div>;
  if (!user)   return <Navigate to="/login" />;
  return (
    <div style={{ display:"flex", height:"100vh" }}>
      <Sidebar />
      <div style={{ flex:1, overflow:"auto" }}>{children}</div>
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

        {/* protected routes */}
        <Route path="/dashboard" element={<PrivateLayout><Dashboard /></PrivateLayout>} />
        <Route path="/groups"   element={<PrivateLayout><Groups /></PrivateLayout>} />
        <Route path="/expenses" element={<PrivateLayout><Expenses /></PrivateLayout>} />
        <Route path="/settle"   element={<PrivateLayout><SettleUp /></PrivateLayout>} />
        <Route path="/profile"  element={<PrivateLayout><Profile /></PrivateLayout>} />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}