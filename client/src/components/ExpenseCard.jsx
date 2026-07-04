import axios from "axios";

const CAT_ICON = { Food:"🍔", Travel:"✈️", Rent:"🏠", Entertainment:"🎬", Shopping:"🛒", Utilities:"💡", Other:"📦" };
const CAT_COLOR = { Food:"#e34948", Travel:"#2a78d6", Rent:"#eda100", Entertainment:"#4a3aa7", Shopping:"#1baf7a", Utilities:"#898781", Other:"#e87ba4" };

export default function ExpenseCard({ expense, currentUserId, onDelete }) {
  const share = Math.round(expense.amount / expense.splitBetween.length);
  const iPaid = expense.paidBy._id === currentUserId;
  const inSplit = expense.splitBetween.some(m => m._id === currentUserId);

  const handleDelete = async () => {
    if (!window.confirm("Delete this expense?")) return;
    try { await axios.delete(`/api/expenses/${expense._id}`); onDelete?.(); }
    catch (e) { alert(e.response?.data?.error || "Could not delete"); }
  };

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:12, background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:8, marginBottom:8 }}>
      <div style={{ width:36, height:36, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, background:`${CAT_COLOR[expense.category]}22`, color:CAT_COLOR[expense.category], flexShrink:0 }}>
        {CAT_ICON[expense.category] || "💸"}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:500, fontSize:13 }}>
          {expense.description}
          {expense.locked && <span style={{ marginLeft:6, fontSize:10, color:"#898781", background:"#f1f0ec", padding:"2px 6px", borderRadius:4 }}>🔒 Locked</span>}
        </div>
        <div style={{ fontSize:11, color:"#898781", marginTop:2 }}>
          {expense.group?.name} · {expense.paidBy?.name} paid · <span style={{ background:"#f1f0ec", padding:"1px 6px", borderRadius:10, fontSize:10 }}>{expense.category}</span> · <span style={{ background:"#f1f0ec", padding:"1px 6px", borderRadius:10, fontSize:10 }}>{expense.paymentMode}</span>
        </div>
      </div>
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <div style={{ fontWeight:500, fontSize:14 }}>₹{expense.amount.toLocaleString()}</div>
        {inSplit && <div style={{ fontSize:11, color: iPaid ? "#3B6D11" : "#a32d2d" }}>
          {iPaid ? `+lent ₹${expense.amount - share}` : `you owe ₹${share}`}
        </div>}
        {!expense.locked && <button onClick={handleDelete} style={{ fontSize:10, color:"#898781", background:"none", border:"none", cursor:"pointer", marginTop:2 }}>🗑 delete</button>}
      </div>
    </div>
  );
}
