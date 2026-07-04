import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const CAT_ICON  = { Food:"🍔", Travel:"✈️", Rent:"🏠", Entertainment:"🎬", Shopping:"🛒", Utilities:"💡", Other:"📦" };
const CAT_COLOR = { Food:"#e34948", Travel:"#2a78d6", Rent:"#eda100", Entertainment:"#4a3aa7", Shopping:"#1baf7a", Utilities:"#898781", Other:"#e87ba4" };
const CATS = ["","Food","Travel","Rent","Entertainment","Shopping","Utilities","Other"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function Expenses() {
  const { user } = useAuth();
  const [expenses,      setExpenses]      = useState([]);
  const [cat,           setCat]           = useState("");
  const [monthFilter,   setMonthFilter]   = useState("");
  const [loading,       setLoading]       = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast,         setToast]         = useState("");
  const [groups,        setGroups]        = useState([]);
  const [showAdd,       setShowAdd]       = useState(false);
  const [members,       setMembers]       = useState([]);
  const [form, setForm] = useState({
    description:"", amount:"", category:"Food",
    groupId:"", paidBy:"", splitBetween:[],
    paymentMode:"UPI", date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchExpenses();
    axios.get("/api/groups").then(r => setGroups(r.data)).catch(()=>{});
  }, [cat]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/expenses${cat ? `?category=${cat}` : ""}`);
      setExpenses(data);
    } catch {}
    finally { setLoading(false); }
  };

  const deleteExpense = async (id) => {
    try {
      await axios.delete(`/api/expenses/${id}`);
      setExpenses(e => e.filter(x => x._id !== id));
      setConfirmDelete(null);
      showToast("Expense deleted ✓");
    } catch(e) { showToast(e.response?.data?.error || "Cannot delete", "error"); setConfirmDelete(null); }
  };

  const onGroupChange = async (gId) => {
    setForm(f => ({...f, groupId:gId, paidBy:user._id, splitBetween:[]}));
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
    setForm(f => ({...f, description:desc, category:cat}));
  };

  const toggleSplit = (id) => {
    setForm(f => ({
      ...f,
      splitBetween: f.splitBetween.includes(id)
        ? f.splitBetween.filter(x=>x!==id)
        : [...f.splitBetween, id]
    }));
  };

  const addExpense = async () => {
    if (!form.description || !form.amount || !form.groupId)
      return showToast("Fill description, amount and group","error");
    try {
      const splitList = form.splitBetween.length ? form.splitBetween : members.map(m=>m._id);
      await axios.post("/api/expenses", {
        ...form,
        amount:      Number(form.amount),
        paidBy:      form.paidBy || user._id,
        splitBetween: splitList,
      });
      setShowAdd(false);
      setForm({ description:"", amount:"", category:"Food", groupId:"", paidBy:"", splitBetween:[], paymentMode:"UPI", date: new Date().toISOString().split("T")[0] });
      fetchExpenses();
      showToast("Expense added ✓");
    } catch(e) { showToast(e.response?.data?.error||"Error","error"); }
  };

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(""),2500); };

  // ── Group by month ────────────────────────────────────────────────────────
  const filtered = expenses.filter(e => {
    if (!monthFilter) return true;
    const d = new Date(e.createdAt||e.date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` === monthFilter;
  });

  // Group by month for display
  const grouped = {};
  filtered.forEach(e => {
    const d   = new Date(e.createdAt||e.date);
    const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  // Available months from expenses
  const availableMonths = [...new Set(expenses.map(e => {
    const d = new Date(e.createdAt||e.date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  }))].sort().reverse();

  return (
    <div style={{ padding:24 }}>
      <Navbar title="Expenses" subtitle="All your transactions"
        action={
          <div style={{ display:"flex", gap:8 }}>
            <select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}
              style={{ padding:"7px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none", background:"#fff" }}>
              <option value="">All months</option>
              {availableMonths.map(m => {
                const [yr, mo] = m.split("-");
                return <option key={m} value={m}>{MONTHS[Number(mo)-1]} {yr}</option>;
              })}
            </select>
            <select value={cat} onChange={e=>setCat(e.target.value)}
              style={{ padding:"7px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none", background:"#fff" }}>
              {CATS.map(c=><option key={c} value={c}>{c||"All categories"}</option>)}
            </select>
            <button onClick={()=>setShowAdd(true)}
              style={{ padding:"7px 14px", background:"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
              + Add
            </button>
          </div>
        }
      />

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#898781" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#898781" }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🧾</div>
          <div style={{ fontSize:14, fontWeight:500, color:"#52514e" }}>No expenses found</div>
          <div style={{ fontSize:12, marginTop:4 }}>Try changing the filters or add a new expense</div>
        </div>
      ) : (
        Object.entries(grouped).map(([month, exps]) => {
          const monthTotal = exps.reduce((s,e)=>s+e.amount,0);
          return (
            <div key={month} style={{ marginBottom:24 }}>
              {/* Month header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, padding:"8px 12px", background:"#f1f0ec", borderRadius:8 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"#52514e" }}>📅 {month}</div>
                <div style={{ fontSize:12, color:"#898781" }}>
                  {exps.length} expense{exps.length>1?"s":""} · <strong style={{color:"#185fa5"}}>₹{monthTotal.toLocaleString()}</strong>
                </div>
              </div>

              {exps.map(e => {
                const share    = Math.round(e.amount / (e.splitBetween?.length || 1));
                const iAmPayer = (e.paidBy?._id || e.paidBy) === user._id;
                const iAmSplit = e.splitBetween?.some(m => (m._id||m) === user._id);
                const expDate  = new Date(e.createdAt||e.date);
                return (
                  <div key={e._id} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:8 }}>
                    <div style={{ flex:1, display:"flex", alignItems:"center", gap:12, padding:14, background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:10 }}>
                      {/* Icon */}
                      <div style={{ width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, background:`${CAT_COLOR[e.category]||"#eee"}22`, color:CAT_COLOR[e.category]||"#666" }}>
                        {CAT_ICON[e.category]||"💸"}
                      </div>
                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:500, fontSize:13, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          {e.description}
                          {e.locked && <span style={{ fontSize:10, background:"#f1f0ec", color:"#898781", padding:"1px 6px", borderRadius:4 }}>🔒 locked</span>}
                        </div>
                        <div style={{ fontSize:11, color:"#898781", marginTop:3, display:"flex", flexWrap:"wrap", gap:4, alignItems:"center" }}>
                          <span>{e.group?.name||"No group"}</span>
                          <span>·</span>
                          <span>{e.paidBy?.name||"?"} paid</span>
                          <span>·</span>
                          <span style={{ background:`${CAT_COLOR[e.category]||"#eee"}22`, color:CAT_COLOR[e.category]||"#666", padding:"1px 7px", borderRadius:10 }}>{e.category}</span>
                          <span style={{ background:"#f1f0ec", padding:"1px 7px", borderRadius:10 }}>{e.paymentMode}</span>
                          <span>·</span>
                          <span>{expDate.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>
                        </div>
                        <div style={{ display:"flex", gap:3, marginTop:5 }}>
                          {e.splitBetween?.slice(0,6).map(m=>(
                            <div key={m._id||m} title={m.name} style={{ width:18, height:18, borderRadius:"50%", background:"#e6f1fb", color:"#185fa5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:500 }}>
                              {(m.name||"?").slice(0,2).toUpperCase()}
                            </div>
                          ))}
                          {e.splitBetween?.length > 6 && <span style={{ fontSize:10, color:"#898781", alignSelf:"center" }}>+{e.splitBetween.length-6}</span>}
                        </div>
                      </div>
                      {/* Amount */}
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontWeight:500, fontSize:15 }}>₹{e.amount.toLocaleString()}</div>
                        {iAmSplit && (
                          <div style={{ fontSize:11, marginTop:2, color:iAmPayer?"#3B6D11":"#a32d2d", fontWeight:500 }}>
                            {iAmPayer ? `+lent ₹${(e.amount-share).toLocaleString()}` : `you owe ₹${share.toLocaleString()}`}
                          </div>
                        )}
                        <div style={{ fontSize:10, color:"#898781", marginTop:2 }}>
                          ÷{e.splitBetween?.length||1} = ₹{share.toLocaleString()} each
                        </div>
                      </div>
                    </div>
                    {/* Delete */}
                    {!e.locked ? (
                      <button onClick={()=>setConfirmDelete({id:e._id,name:e.description})}
                        style={{ padding:"0 12px", background:"#fcebeb", color:"#a32d2d", border:"0.5px solid #e34948", borderRadius:8, fontSize:14, cursor:"pointer", flexShrink:0, alignSelf:"stretch" }}>
                        🗑
                      </button>
                    ) : (
                      <div style={{ padding:"0 12px", background:"#f1f0ec", borderRadius:8, fontSize:14, flexShrink:0, alignSelf:"stretch", display:"flex", alignItems:"center", color:"#898781" }}>🔒</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {/* ── Add Expense Modal ── */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:460, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:500 }}>Add expense</div>
              <button onClick={()=>setShowAdd(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#898781" }}>✕</button>
            </div>

            {/* Description */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Description <span style={{color:"#e34948"}}>*</span></div>
              <input value={form.description} onChange={e=>autoTag(e.target.value)} placeholder="e.g. Hotel booking Goa"
                style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
            </div>

            {/* Amount + Date */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Amount (₹) <span style={{color:"#e34948"}}>*</span></div>
                <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0"
                  style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Date</div>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}
                  style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
              </div>
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

            {/* Category quick-pick */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
              {["Food","Travel","Rent","Entertainment","Shopping","Utilities","Other"].map(c=>(
                <div key={c} onClick={()=>setForm(f=>({...f,category:c}))}
                  style={{ padding:"4px 10px", borderRadius:20, fontSize:11, cursor:"pointer", fontWeight:500,
                    background: form.category===c ? CAT_COLOR[c] : `${CAT_COLOR[c]}22`,
                    color:      form.category===c ? "#fff" : CAT_COLOR[c] }}>
                  {CAT_ICON[c]} {c}
                </div>
              ))}
            </div>

            {/* Paid by */}
            {members.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Paid by</div>
                <select value={form.paidBy||user._id} onChange={e=>setForm(f=>({...f,paidBy:e.target.value}))}
                  style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }}>
                  {members.map(m=><option key={m._id} value={m._id}>{m.name}{m._id===user._id?" (you)":""}</option>)}
                </select>
              </div>
            )}

            {/* Split between */}
            {members.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:8 }}>
                  Split between <span style={{ fontWeight:400, color:"#898781" }}>(default: all)</span>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {members.map(m=>{
                    const sel = form.splitBetween.length===0 || form.splitBetween.includes(m._id);
                    return (
                      <div key={m._id} onClick={()=>toggleSplit(m._id)}
                        style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer", fontWeight:500,
                          background:sel?"#2a78d6":"#f1f0ec", color:sel?"#fff":"#52514e",
                          border:sel?"none":"0.5px solid rgba(0,0,0,0.1)" }}>
                        {m.name}{m._id===user._id?" (you)":""}
                      </div>
                    );
                  })}
                </div>
                {form.splitBetween.length > 0 && form.amount && (
                  <div style={{ marginTop:8, fontSize:12, color:"#52514e", background:"#f8f7f4", padding:"8px 12px", borderRadius:8 }}>
                    Each person pays: <strong style={{color:"#2a78d6"}}>₹{Math.round(Number(form.amount)/form.splitBetween.length).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Payment mode */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Payment mode</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["UPI","Cash","Bank transfer","Partial payment","Pending"].map(m=>(
                  <div key={m} onClick={()=>setForm(f=>({...f,paymentMode:m}))}
                    style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer", fontWeight:500,
                      background:form.paymentMode===m?"#2a78d6":"#f1f0ec",
                      color:form.paymentMode===m?"#fff":"#52514e",
                      border:form.paymentMode===m?"none":"0.5px solid rgba(0,0,0,0.1)" }}>
                    {m}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowAdd(false)} style={{ padding:"8px 16px", background:"#f1f0ec", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:8, fontSize:13, cursor:"pointer" }}>Cancel</button>
              <button onClick={addExpense} style={{ padding:"8px 16px", background:"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>Add expense</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:340 }}>
            <div style={{ fontSize:16, fontWeight:500, marginBottom:8 }}>🗑 Delete expense?</div>
            <div style={{ fontSize:13, color:"#52514e", marginBottom:16 }}>
              "<strong>{confirmDelete.name}</strong>" will be permanently deleted.
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setConfirmDelete(null)} style={{ padding:"7px 16px", background:"#f1f0ec", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:8, fontSize:13, cursor:"pointer" }}>Cancel</button>
              <button onClick={()=>deleteExpense(confirmDelete.id)} style={{ padding:"7px 16px", background:"#e34948", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:"fixed", bottom:16, right:16, background:toast.type==="error"?"#a32d2d":"#0b0b0b", color:"#fff", padding:"10px 16px", borderRadius:8, fontSize:13, zIndex:200 }}>{toast.msg}</div>}
    </div>
  );
}
