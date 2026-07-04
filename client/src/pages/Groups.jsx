import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ExpenseCard from "../components/ExpenseCard";

export default function Groups() {
  const { user } = useAuth();
  const [groups,     setGroups]     = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [groupExp,   setGroupExp]   = useState([]);
  const [groupBal,   setGroupBal]   = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddExp, setShowAddExp] = useState(false);
  const [form,    setForm]    = useState({ name:"", icon:"🏖️", type:"Trip", memberEmails:"" });
  const [expForm, setExpForm] = useState({ description:"", amount:"", category:"Food", paidBy:"", splitBetween:[], paymentMode:"UPI" });
  const [toast,   setToast]   = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'group'|'expense', id, name }

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    try { const { data } = await axios.get("/api/groups"); setGroups(data); }
    catch {}
  };

  const openGroup = async (g) => {
    setSelected(g); setLoading(true);
    setExpForm(f => ({...f, paidBy: user._id, splitBetween: g.members.map(m=>m._id)}));
    try {
      const [eRes, bRes] = await Promise.all([
        axios.get(`/api/expenses?groupId=${g._id}`),
        axios.get(`/api/expenses/balances`),
      ]);
      setGroupExp(eRes.data);
      setGroupBal(bRes.data);
    } catch { setGroupExp([]); setGroupBal([]); }
    setLoading(false);
  };

  const createGroup = async () => {
    if (!form.name.trim()) return showToast("Enter a group name", "error");
    try {
      const memberEmails = form.memberEmails.split(",").map(e=>e.trim()).filter(Boolean);
      const { data } = await axios.post("/api/groups", { ...form, memberEmails });
      setGroups(g => [...g, data]);
      setShowCreate(false);
      setForm({ name:"", icon:"🏖️", type:"Trip", memberEmails:"" });
      showToast(`Group "${data.name}" created ✓`);
    } catch(e) { showToast(e.response?.data?.error||"Error","error"); }
  };

  // ── Delete group ──────────────────────────────────────────────────────────
  const deleteGroup = async (groupId) => {
    try {
      await axios.delete(`/api/groups/${groupId}`);
      setGroups(g => g.filter(x => x._id !== groupId));
      setSelected(null);
      setConfirmDelete(null);
      showToast("Group deleted ✓");
    } catch(e) { showToast(e.response?.data?.error||"Could not delete group","error"); setConfirmDelete(null); }
  };

  // ── Delete expense ────────────────────────────────────────────────────────
  const deleteExpense = async (expenseId) => {
    try {
      await axios.delete(`/api/expenses/${expenseId}`);
      setGroupExp(e => e.filter(x => x._id !== expenseId));
      setConfirmDelete(null);
      showToast("Expense deleted ✓");
    } catch(e) { showToast(e.response?.data?.error||"Could not delete","error"); setConfirmDelete(null); }
  };

  const addExpenseToGroup = async () => {
    if (!expForm.description || !expForm.amount) return showToast("Fill all fields","error");
    try {
      const splitList = expForm.splitBetween.length ? expForm.splitBetween : selected.members.map(m=>m._id);
      await axios.post("/api/expenses", {
        ...expForm, groupId: selected._id,
        amount: Number(expForm.amount),
        paidBy: expForm.paidBy || user._id,
        splitBetween: splitList,
      });
      setShowAddExp(false);
      setExpForm(f => ({...f, description:"", amount:""}));
      openGroup(selected);
      showToast("Expense added ✓");
    } catch(e) { showToast(e.response?.data?.error||"Error","error"); }
  };

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(""),2500); };

  const totalSpent = groupExp.reduce((s,e)=>s+e.amount,0);
  const icons = ["🏖️","🏠","🍽️","💼","✈️","🎉","🏕️","👯"];

  // ── Confirm Delete Modal ──────────────────────────────────────────────────
  const ConfirmModal = () => !confirmDelete ? null : (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:360 }}>
        <div style={{ fontSize:16, fontWeight:500, marginBottom:8 }}>
          {confirmDelete.type === "group" ? "🗑 Delete group?" : "🗑 Delete expense?"}
        </div>
        <div style={{ fontSize:13, color:"#52514e", marginBottom:6 }}>
          <strong>"{confirmDelete.name}"</strong> will be permanently deleted.
        </div>
        {confirmDelete.type === "group" && (
          <div style={{ fontSize:12, color:"#a32d2d", background:"#fcebeb", padding:"8px 12px", borderRadius:8, marginBottom:16 }}>
            ⚠️ This will also delete all expenses in this group.
          </div>
        )}
        {confirmDelete.type === "expense" && confirmDelete.locked && (
          <div style={{ fontSize:12, color:"#a32d2d", background:"#fcebeb", padding:"8px 12px", borderRadius:8, marginBottom:16 }}>
            🔒 This expense is locked after settlement and cannot be deleted.
          </div>
        )}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
          <button onClick={()=>setConfirmDelete(null)}
            style={{ padding:"7px 16px", background:"#f1f0ec", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:8, fontSize:13, cursor:"pointer" }}>
            Cancel
          </button>
          {!confirmDelete.locked && (
            <button onClick={()=> confirmDelete.type==="group" ? deleteGroup(confirmDelete.id) : deleteExpense(confirmDelete.id)}
              style={{ padding:"7px 16px", background:"#e34948", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
              Yes, delete
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ── Group Detail View ─────────────────────────────────────────────────────
  if (selected) return (
    <div style={{ padding:24 }}>
      <ConfirmModal />

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <button onClick={()=>setSelected(null)}
          style={{ background:"none", border:"0.5px solid rgba(0,0,0,0.15)", borderRadius:8, padding:"6px 12px", fontSize:13, cursor:"pointer", color:"#52514e" }}>
          ← Back
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:500 }}>{selected.icon} {selected.name}</div>
          <div style={{ fontSize:12, color:"#898781" }}>{selected.members?.length} members · {selected.type}</div>
        </div>
        <button onClick={()=>setShowAddExp(true)}
          style={{ padding:"7px 14px", background:"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
          + Add expense
        </button>
        {/* Delete group button — only admin */}
        <button onClick={()=>setConfirmDelete({ type:"group", id:selected._id, name:selected.name })}
          style={{ padding:"7px 14px", background:"#fcebeb", color:"#a32d2d", border:"0.5px solid #e34948", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
          🗑 Delete group
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"TOTAL SPENT", val:`₹${totalSpent.toLocaleString()}`, color:"#185fa5" },
          { label:"EXPENSES",    val:groupExp.length,                    color:"#52514e" },
          { label:"MEMBERS",     val:selected.members?.length,           color:"#52514e" },
        ].map(c=>(
          <div key={c.label} style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:10, padding:14 }}>
            <div style={{ fontSize:11, color:"#898781", fontWeight:500 }}>{c.label}</div>
            <div style={{ fontSize:22, fontWeight:500, color:c.color, marginTop:4 }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Members */}
      <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:10, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:500, color:"#52514e", marginBottom:12 }}>👥 Members</div>
        {selected.members?.map(m => {
          const bal = groupBal.find(b=>b.userId===m._id);
          const isAdmin = selected.roles?.find(r=>(r.user?._id||r.user)===m._id)?.role==="Admin";
          return (
            <div key={m._id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"0.5px solid #f1f0ec" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"#e6f1fb", color:"#185fa5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:500 }}>
                {m.name?.slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{m.name} {m._id===user._id?"(you)":""}</div>
                <div style={{ fontSize:11, color:"#898781" }}>{m.email}</div>
              </div>
              {isAdmin && <span style={{ fontSize:10, background:"#faeeda", color:"#854f0b", padding:"2px 8px", borderRadius:4, fontWeight:500 }}>Admin</span>}
              {bal && (
                <span style={{ fontSize:12, fontWeight:500, color: bal.amount>0?"#3B6D11":"#a32d2d" }}>
                  {bal.amount>0 ? `owes you ₹${bal.amount}` : `you owe ₹${Math.abs(bal.amount)}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Expenses list with delete button */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, paddingBottom:6, borderBottom:"0.5px solid rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize:13, fontWeight:500, color:"#52514e" }}>Expenses ({groupExp.length})</div>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:30, color:"#898781" }}>Loading…</div>
      ) : groupExp.length === 0 ? (
        <div style={{ textAlign:"center", padding:"30px 0", color:"#898781" }}>
          <div style={{ fontSize:28, marginBottom:8 }}>🧾</div>
          No expenses yet in this group
        </div>
      ) : (
        groupExp.map(e => (
          <div key={e._id} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:8 }}>
            <div style={{ flex:1 }}>
              <ExpenseCard expense={e} currentUserId={user._id} onDelete={()=>openGroup(selected)} />
            </div>
            {/* Delete expense button */}
            {!e.locked && (
              <button
                onClick={()=>setConfirmDelete({ type:"expense", id:e._id, name:e.description, locked:e.locked })}
                style={{ padding:"8px 10px", background:"#fcebeb", color:"#a32d2d", border:"0.5px solid #e34948", borderRadius:8, fontSize:12, cursor:"pointer", whiteSpace:"nowrap", marginTop:0, flexShrink:0 }}>
                🗑
              </button>
            )}
            {e.locked && (
              <span style={{ padding:"8px 10px", background:"#f1f0ec", color:"#898781", borderRadius:8, fontSize:11, whiteSpace:"nowrap", flexShrink:0 }}>
                🔒
              </span>
            )}
          </div>
        ))
      )}

      {/* Add Expense Modal */}
      {showAddExp && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={e=>e.target===e.currentTarget&&setShowAddExp(false)}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:440, maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:500 }}>Add expense to {selected.name}</div>
              <button onClick={()=>setShowAddExp(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            {[["Description","text",expForm.description,v=>setExpForm(f=>({...f,description:v})),"e.g. Hotel booking"],
              ["Amount (₹)","number",expForm.amount,v=>setExpForm(f=>({...f,amount:v})),"0"]
            ].map(([label,type,val,onChange,ph])=>(
              <div key={label} style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>{label}</div>
                <input type={type} value={val} onChange={e=>onChange(e.target.value)} placeholder={ph}
                  style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
              </div>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Paid by</div>
                <select value={expForm.paidBy} onChange={e=>setExpForm(f=>({...f,paidBy:e.target.value}))}
                  style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }}>
                  {selected.members?.map(m=><option key={m._id} value={m._id}>{m.name}{m._id===user._id?" (you)":""}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Category</div>
                <select value={expForm.category} onChange={e=>setExpForm(f=>({...f,category:e.target.value}))}
                  style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }}>
                  {["Food","Travel","Rent","Entertainment","Shopping","Utilities","Other"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:8 }}>Split between</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {selected.members?.map(m=>{
                  const sel = expForm.splitBetween.includes(m._id);
                  return (
                    <div key={m._id} onClick={()=>setExpForm(f=>({...f,splitBetween:sel?f.splitBetween.filter(x=>x!==m._id):[...f.splitBetween,m._id]}))}
                      style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer", fontWeight:500, background:sel?"#2a78d6":"#f1f0ec", color:sel?"#fff":"#52514e", border:sel?"none":"0.5px solid rgba(0,0,0,0.1)" }}>
                      {m.name}{m._id===user._id?" (you)":""}
                    </div>
                  );
                })}
              </div>
              {expForm.splitBetween.length > 0 && expForm.amount && (
                <div style={{ marginTop:8, fontSize:11, color:"#52514e", background:"#f8f7f4", padding:"6px 10px", borderRadius:6 }}>
                  Each pays: <strong>₹{Math.round(Number(expForm.amount)/expForm.splitBetween.length).toLocaleString()}</strong>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowAddExp(false)} style={{ padding:"7px 14px", background:"#f1f0ec", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:8, fontSize:13, cursor:"pointer" }}>Cancel</button>
              <button onClick={addExpenseToGroup} style={{ padding:"7px 14px", background:"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>Add expense</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:"fixed", bottom:16, right:16, background:toast.type==="error"?"#a32d2d":"#0b0b0b", color:"#fff", padding:"10px 16px", borderRadius:8, fontSize:13, zIndex:200 }}>{toast.msg}</div>}
    </div>
  );

  // ── Groups List ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding:24 }}>
      <ConfirmModal />
      <Navbar title="Groups" subtitle="Manage your split groups"
        action={<button onClick={()=>setShowCreate(true)} style={{ padding:"7px 14px", background:"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>+ Create group</button>} />

      {groups.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#898781" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>👥</div>
          <div style={{ fontSize:14, fontWeight:500, color:"#52514e", marginBottom:4 }}>No groups yet</div>
          <div style={{ fontSize:12, marginBottom:16 }}>Create a group to start splitting expenses</div>
          <button onClick={()=>setShowCreate(true)} style={{ padding:"8px 18px", background:"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>Create first group</button>
        </div>
      ) : (
        groups.map(g => (
          <div key={g._id} style={{ display:"flex", alignItems:"center", gap:12, padding:14, background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:10, marginBottom:8 }}>
            {/* Clickable group info */}
            <div onClick={()=>openGroup(g)} style={{ display:"flex", alignItems:"center", gap:12, flex:1, cursor:"pointer" }}>
              <div style={{ width:44, height:44, borderRadius:10, background:"#f1f0ec", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{g.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:500, fontSize:14 }}>{g.name}</div>
                <div style={{ fontSize:11, color:"#898781", marginTop:2 }}>{g.members?.length} members · {g.type}</div>
                <div style={{ marginTop:4, display:"flex", gap:3 }}>
                  {g.members?.slice(0,5).map(m=>(
                    <div key={m._id} style={{ width:20, height:20, borderRadius:"50%", background:"#e6f1fb", color:"#185fa5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:500 }}>
                      {m.name?.slice(0,2).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ color:"#898781", fontSize:20 }}>›</div>
            </div>
            {/* Delete group button */}
            <button
              onClick={e=>{ e.stopPropagation(); setConfirmDelete({ type:"group", id:g._id, name:g.name }); }}
              style={{ padding:"6px 10px", background:"#fcebeb", color:"#a32d2d", border:"0.5px solid #e34948", borderRadius:8, fontSize:12, cursor:"pointer", flexShrink:0 }}>
              🗑
            </button>
          </div>
        ))
      )}

      {/* Create Group Modal */}
      {showCreate && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:420 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:500 }}>Create group</div>
              <button onClick={()=>setShowCreate(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Group name</div>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Goa Trip 2026"
                style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:8 }}>Icon</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {icons.map(ic=>(
                  <button key={ic} onClick={()=>setForm(f=>({...f,icon:ic}))}
                    style={{ width:38, height:38, fontSize:18, borderRadius:8, border: form.icon===ic?"2px solid #2a78d6":"1px solid rgba(0,0,0,0.1)", background: form.icon===ic?"#e6f1fb":"#fff", cursor:"pointer" }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Type</div>
              <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }}>
                {["Trip","Home","Food","Work","Other"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>
                Member emails <span style={{ fontWeight:400, color:"#898781" }}>(comma-separated)</span>
              </div>
              <input value={form.memberEmails} onChange={e=>setForm(f=>({...f,memberEmails:e.target.value}))}
                placeholder="rahul@gmail.com, priya@gmail.com"
                style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
              <div style={{ fontSize:11, color:"#898781", marginTop:4 }}>Members must already have a SplitEase account</div>
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setShowCreate(false)} style={{ padding:"7px 14px", background:"#f1f0ec", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:8, fontSize:13, cursor:"pointer" }}>Cancel</button>
              <button onClick={createGroup} style={{ padding:"7px 14px", background:"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>Create group</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:"fixed", bottom:16, right:16, background:toast.type==="error"?"#a32d2d":"#0b0b0b", color:"#fff", padding:"10px 16px", borderRadius:8, fontSize:13, zIndex:200 }}>{toast.msg}</div>}
    </div>
  );
}
