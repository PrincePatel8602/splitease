import { useState, useEffect, lazy, Suspense } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ExpenseCard from "../components/ExpenseCard";
import { getCache, setCache } from "../utils/cache";

// Chart library loads only when needed → faster first paint
const SpendingChart = lazy(() => import("../components/SpendingChart"));

const CAT_ICON  = { Food:"🍔", Travel:"✈️", Rent:"🏠", Entertainment:"🎬", Shopping:"🛒", Utilities:"💡", Other:"📦" };
const CAT_COLOR = { Food:"#e34948", Travel:"#4f2fe0", Rent:"#eda100", Entertainment:"#4a3aa7", Shopping:"#1baf7a", Utilities:"#898781", Other:"#e87ba4" };

export default function Dashboard() {
  const { user } = useAuth();
  const cacheKey = `dash:${user._id}`;
  const cached   = getCache(cacheKey);
  const [expenses,  setExpenses]  = useState(cached?.expenses  || []);
  const [balances,  setBalances]  = useState(cached?.balances  || []);
  const [optimized, setOptimized] = useState(cached?.optimized || []);
  const [groups,    setGroups]    = useState(cached?.groups    || []);
  const [stats,     setStats]     = useState(cached?.stats     || []);
  const [members,   setMembers]   = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ description:"", amount:"", category:"Food", groupId:"", paidBy:"", splitBetween:[], paymentMode: user?.defaultPaymentMode || "UPI" });
  const [aiTag,   setAiTag]   = useState(null);
  const [toast,   setToast]   = useState("");
  const [loading, setLoading] = useState(!cached);   // spinner only on first visit

  useEffect(() => { fetchAll(); }, []);

  // Silent refresh: shows cached data instantly, updates when fresh data arrives
  const fetchAll = async () => {
    try {
      const [eRes, gRes, bRes, oRes, sRes] = await Promise.all([
        axios.get("/api/expenses?limit=10"),
        axios.get("/api/groups"),
        axios.get("/api/expenses/balances"),
        axios.get("/api/expenses/optimize"),
        axios.get("/api/expenses/stats").catch(() => ({ data: [] })),
      ]);
      setExpenses(eRes.data);
      setGroups(gRes.data);
      setBalances(bRes.data);
      setOptimized(oRes.data);
      setStats(sRes.data);
      setCache(cacheKey, { expenses: eRes.data, groups: gRes.data, balances: bRes.data, optimized: oRes.data, stats: sRes.data });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Compute summary from real balances
  const youOwe    = balances.filter(b => b.amount < 0).reduce((s, b) => s + Math.abs(b.amount), 0);
  const owedToYou = balances.filter(b => b.amount > 0).reduce((s, b) => s + b.amount, 0);
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.createdAt); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  const onGroupChange = async (gId) => {
    setForm(f => ({...f, groupId: gId, splitBetween: []}));
    const g = groups.find(x => x._id === gId);
    if (g) setMembers(g.members);
  };

  const autoTag = (desc) => {
    const d = desc.toLowerCase();
    let cat = "Other";
    if (/food|eat|restaurant|pizza|swiggy|zomato|burger|dinner|lunch|breakfast/.test(d)) cat="Food";
    else if (/hotel|flight|trip|travel|petrol|uber|ola|cab|train|bus/.test(d)) cat="Travel";
    else if (/rent|apartment|flat|house/.test(d)) cat="Rent";
    else if (/movie|netflix|game|concert|show/.test(d)) cat="Entertainment";
    else if (/shop|mall|amazon|flipkart|grocery/.test(d)) cat="Shopping";
    else if (/bill|electric|water|gas|wifi|internet/.test(d)) cat="Utilities";
    const type = /friend|group|team|with|all/.test(d) ? "Group expense" : "Individual";
    if (desc.length > 3) { setAiTag({ cat, type }); setForm(f=>({...f, category: cat})); }
    else setAiTag(null);
  };

  const toggleSplit = (id) => {
    setForm(f => ({
      ...f,
      splitBetween: f.splitBetween.includes(id)
        ? f.splitBetween.filter(x => x !== id)
        : [...f.splitBetween, id]
    }));
  };

  const addExpense = async () => {
    if (!form.description || !form.amount || !form.groupId)
      return showToastMsg("Fill description, amount and group", "error");
    try {
      const splitList = form.splitBetween.length
        ? form.splitBetween
        : members.map(m => m._id);
      await axios.post("/api/expenses", {
        ...form,
        amount:      Number(form.amount),
        paidBy:      form.paidBy || user._id,
        splitBetween: splitList,
      });
      setShowModal(false);
      setForm({ description:"", amount:"", category:"Food", groupId:"", paidBy:"", splitBetween:[], paymentMode: user?.defaultPaymentMode || "UPI" });
      setAiTag(null);
      fetchAll();
      showToastMsg("Expense added ✓");
    } catch(e) { showToastMsg(e.response?.data?.error || "Error", "error"); }
  };

  const showToastMsg = (msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(""), 2500);
  };

  return (
    <div className="page">
      <Navbar title="Dashboard" subtitle="Your financial overview"
        action={
          <button onClick={()=>setShowModal(true)}
            style={{ padding:"8px 16px", background:"#4f2fe0", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
            + Add expense
          </button>
        }
      />

      {/* ── Summary Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:20 }}>
        {[
          { label:"YOU OWE",      val: youOwe,    color:"#a32d2d", sub: balances.filter(b=>b.amount<0).map(b=>`${b.name}: ₹${Math.abs(b.amount)}`).join(", ")||"Nothing 🎉" },
          { label:"OWED TO YOU",  val: owedToYou, color:"#3B6D11", sub: balances.filter(b=>b.amount>0).map(b=>`${b.name}: ₹${b.amount}`).join(", ")||"No one owes you" },
          { label:"THIS MONTH",   val: thisMonth, color:"#3a20b8", sub:`${expenses.filter(e=>{ const d=new Date(e.createdAt),n=new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }).length} expenses` },
        ].map(c => (
          <div key={c.label} className="card" style={{ marginBottom:0 }}>
            <div style={{ fontSize:11, fontWeight:500, color:"#898781", letterSpacing:"0.5px" }}>{c.label}</div>
            <div style={{ fontSize:26, fontWeight:500, color:c.color, margin:"6px 0 4px" }}>₹{c.val.toLocaleString()}</div>
            <div style={{ fontSize:11, color:"#898781", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Spending chart ── */}
      <div className="card">
        <div style={{ fontSize:13, fontWeight:500, color:"#52514e", marginBottom:8 }}>📈 My spending</div>
        <Suspense fallback={<div style={{ height:220 }} />}>
          <SpendingChart rows={stats} groups={groups} />
        </Suspense>
      </div>

      {/* ── Who owes who ── */}
      {balances.length > 0 && (
        <div className="card">
          <div style={{ fontSize:13, fontWeight:500, color:"#52514e", marginBottom:12 }}>💰 Balances</div>
          {balances.map(b => (
            <div key={b.userId} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderBottom:"0.5px solid #f1f0ec" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background: b.amount>0?"#eaf3de":"#fcebeb", color: b.amount>0?"#3B6D11":"#a32d2d", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:500 }}>
                  {b.name.slice(0,2).toUpperCase()}
                </div>
                <span style={{ fontSize:13 }}>{b.name}</span>
              </div>
              <div style={{ fontSize:13, fontWeight:500, color: b.amount>0?"#3B6D11":"#a32d2d" }}>
                {b.amount > 0 ? `owes you ₹${b.amount}` : `you owe ₹${Math.abs(b.amount)}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Debt simplification ── */}
      {optimized.length > 0 && (
        <div className="card" style={{ border:"1px solid rgba(79,47,224,0.35)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
            <span style={{ fontSize:22 }}>🧮</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"#3a20b8" }}>Debt simplification</div>
              <div style={{ fontSize:11, color:"#52514e", marginTop:2 }}>
                Fewest payments needed to settle everyone: {optimized.length}
              </div>
            </div>
            <Link to="/settle" style={{ padding:"6px 14px", background:"#4f2fe0", color:"#fff", borderRadius:10, fontSize:12, fontWeight:500, textDecoration:"none" }}>
              Settle up →
            </Link>
          </div>
          {optimized.map((o, i) => {
            const iPay = o.from === user._id;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderTop:"1px solid rgba(0,0,0,0.06)", fontSize:13 }}>
                <span style={{ flex:1 }}>
                  <strong>{iPay ? "You" : o.fromName}</strong> pay{iPay ? "" : "s"} <strong>{o.to === user._id ? "you" : o.toName}</strong>
                </span>
                {o.pending && <span style={{ fontSize:10, background:"#faeeda", color:"#854f0b", padding:"2px 8px", borderRadius:20 }}>⏳ payment pending</span>}
                <strong style={{ color: iPay ? "#a32d2d" : "#3B6D11" }}>₹{o.amount.toLocaleString()}</strong>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recent Expenses ── */}
      <div style={{ fontSize:13, fontWeight:500, color:"#52514e", marginBottom:10, paddingBottom:6, borderBottom:"0.5px solid rgba(0,0,0,0.1)" }}>
        Recent expenses
      </div>
      {loading ? (
        <div style={{ textAlign:"center", padding:30, color:"#898781" }}>Loading…</div>
      ) : expenses.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#898781" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🧾</div>
          <div style={{ fontWeight:500, color:"#52514e", marginBottom:4 }}>No expenses yet</div>
          <div style={{ fontSize:12 }}>Create a group and add your first expense</div>
        </div>
      ) : (
        expenses.map(e => <ExpenseCard key={e._id} expense={e} currentUserId={user._id} onDelete={fetchAll} />)
      )}

      {/* ── Add Expense Modal ── */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}
          onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:"calc(100% - 24px)", maxWidth:460, maxHeight:"88vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:500 }}>Add expense</div>
              <button onClick={()=>setShowModal(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#898781" }}>✕</button>
            </div>

            {/* Description */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Description <span style={{color:"#e34948"}}>*</span></div>
              <input value={form.description} onChange={e=>{setForm(f=>({...f,description:e.target.value}));autoTag(e.target.value);}}
                placeholder="e.g. Swiggy dinner with friends"
                style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
              {aiTag && (
                <div style={{ marginTop:6, display:"flex", gap:6 }}>
                  <span style={{ background:"#ebe7fd", color:"#3a20b8", padding:"2px 10px", borderRadius:20, fontSize:11 }}>🤖 {aiTag.cat}</span>
                  <span style={{ background:"#ebe7fd", color:"#3a20b8", padding:"2px 10px", borderRadius:20, fontSize:11 }}>{aiTag.type}</span>
                </div>
              )}
            </div>

            {/* Amount */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Amount (₹) <span style={{color:"#e34948"}}>*</span></div>
              <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0"
                style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
            </div>

            {/* Group + Category */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Group <span style={{color:"#e34948"}}>*</span></div>
                <select value={form.groupId} onChange={e=>onGroupChange(e.target.value)}
                  style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }}>
                  <option value="">Select group</option>
                  {groups.map(g=><option key={g._id} value={g._id}>{g.icon} {g.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Category</div>
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                  style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }}>
                  {["Food","Travel","Rent","Entertainment","Shopping","Utilities","Other"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Paid by */}
            {members.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Paid by</div>
                <select value={form.paidBy || user._id} onChange={e=>setForm(f=>({...f,paidBy:e.target.value}))}
                  style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }}>
                  {members.map(m=><option key={m._id} value={m._id}>{m.name}{m._id===user._id?" (you)":""}</option>)}
                </select>
              </div>
            )}

            {/* Split between */}
            {members.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:8 }}>
                  Split between
                  <span style={{ fontWeight:400, color:"#898781", marginLeft:4 }}>(default: all members)</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {members.map(m => {
                    const selected = form.splitBetween.length === 0 || form.splitBetween.includes(m._id);
                    return (
                      <div key={m._id} onClick={()=>toggleSplit(m._id)}
                        style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer", fontWeight:500,
                          background: selected ? "#4f2fe0" : "#f1f0ec",
                          color:      selected ? "#fff"    : "#52514e",
                          border:     selected ? "none"    : "0.5px solid rgba(0,0,0,0.1)" }}>
                        {m.name}{m._id===user._id?" (you)":""}
                      </div>
                    );
                  })}
                </div>
                {form.splitBetween.length > 0 && form.amount && (
                  <div style={{ marginTop:8, fontSize:11, color:"#52514e", background:"#f8f7f4", padding:"6px 10px", borderRadius:6 }}>
                    Each person pays: <strong>₹{Math.round(Number(form.amount)/form.splitBetween.length).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Payment mode */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Payment mode</div>
              <select value={form.paymentMode} onChange={e=>setForm(f=>({...f,paymentMode:e.target.value}))}
                style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }}>
                {["UPI","Cash","Bank transfer","Partial payment","Pending"].map(m=><option key={m}>{m}</option>)}
              </select>
            </div>

            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowModal(false)}
                style={{ padding:"8px 16px", background:"#f1f0ec", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:8, fontSize:13, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={addExpense}
                style={{ padding:"8px 16px", background:"#4f2fe0", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
                Add expense
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:16, right:16, background: toast.type==="error"?"#a32d2d":"#0b0b0b", color:"#fff", padding:"10px 16px", borderRadius:8, fontSize:13, zIndex:200 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
