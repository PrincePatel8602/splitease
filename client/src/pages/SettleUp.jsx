import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import RazorpayButton from "../components/RazorpayButton";

export default function SettleUp() {
  const { user } = useAuth();
  const [balances,     setBalances]     = useState([]); // who owes who
  const [payments,     setPayments]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState("");
  const [receiptModal, setReceiptModal] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [receiptFile,  setReceiptFile]  = useState(null);
  const [receiptNote,  setReceiptNote]  = useState("");
  const [manualMode,   setManualMode]   = useState("Cash");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const fileRef = useRef();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        axios.get("/api/expenses/balances"),
        axios.get("/api/payments"),
      ]);
      setBalances(bRes.data);
      setPayments(pRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(""), 3000);
  };

  // ── Submit receipt ────────────────────────────────────────────────────────
 const handleSubmitReceipt = async () => {
  if (!receiptFile) return showToast("Please select a receipt image", "error");
  setSubmitting(true);
  
  // Save toName before clearing modal
  const toName = receiptModal.toName || receiptModal.to?.name || "";
  
  try {
    let paymentId = receiptModal._id;

    if (receiptModal.isManualSettle) {
      const { data } = await axios.post("/api/payments", {
        fromUserId:  user._id,
        toUserId:    receiptModal.toUserId,
        amount:      receiptModal.amount,
        paymentMode: manualMode,
        expenseIds:  [],
      });
      paymentId = data.payment._id;
      await new Promise(r => setTimeout(r, 500));
    }

    const formData = new FormData();
    formData.append("receipt", receiptFile);
    formData.append("note", receiptNote);
    
    await axios.post(`/api/payments/${paymentId}/receipt`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    
    setReceiptModal(null);
    setReceiptFile(null);
    setReceiptNote("");
    setManualMode("Cash");
    showToast("✅ Receipt submitted! Waiting for " + toName + " to approve.");
    fetchData();
  } catch (err) {
    showToast(err.response?.data?.error || "Upload failed", "error");
  } finally {
    setSubmitting(false);
  }
};
  // ── Approve ───────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/payments/${approveModal._id}/approve`);
      setApproveModal(null);
      showToast("✅ Approved! Expenses locked 🔒 and receipts emailed.");
      fetchData();
    } catch (e) { showToast(e.response?.data?.error || "Error", "error"); }
    finally { setSubmitting(false); }
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/payments/${approveModal._id}/reject`, { reason: rejectReason });
      setApproveModal(null); setRejectReason("");
      showToast("Receipt rejected. Payer has been notified.");
      fetchData();
    } catch (e) { showToast(e.response?.data?.error || "Error", "error"); }
    finally { setSubmitting(false); }
  };

 const downloadReceipt = async (id) => {
  try {
    const res = await axios.get(`/api/payments/${id}/receipt`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a   = document.createElement("a");
    a.href    = url;
    a.download = `receipt-${id}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    showToast("Could not download receipt", "error");
  }
};

  // ── Compute what's pending ────────────────────────────────────────────────
  // Payments I need to act on
  const pendingUpload = payments.filter(p => p.status === "pending_receipt" && p.from?._id === user._id);
  const pendingApproval = payments.filter(p => p.status === "receipt_submitted" && p.to?._id === user._id);

  // Balances where I owe someone and no pending payment exists
  const settledUserIds = new Set(
    payments
      .filter(p => ["pending_receipt","receipt_submitted","approved"].includes(p.status))
      .map(p => p.from?._id === user._id ? p.to?._id : p.from?._id)
  );

  const iOweList  = balances.filter(b => b.amount < 0 && !settledUserIds.has(b.userId));
  const owedToMe  = balances.filter(b => b.amount > 0);

  const STATUS = {
    pending_receipt:   { label:"⏳ Receipt pending", color:"#854f0b", bg:"#faeeda" },
    receipt_submitted: { label:"📋 Awaiting approval", color:"#185fa5", bg:"#e6f1fb" },
    approved:          { label:"✅ Approved",           color:"#3B6D11", bg:"#eaf3de" },
    rejected:          { label:"❌ Rejected",           color:"#a32d2d", bg:"#fcebeb" },
  };

  return (
    <div style={{ padding:24 }}>
      <Navbar title="Settle up" subtitle="Clear your debts" />

      {loading ? <div style={{ textAlign:"center", padding:40, color:"#898781" }}>Loading…</div> : <>

        {/* ── Action Required ── */}
        {(pendingUpload.length > 0 || pendingApproval.length > 0) && (
          <div style={{ background:"#faeeda", border:"0.5px solid #eda100", borderRadius:10, padding:16, marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#854f0b", marginBottom:10 }}>
              ⚡ Action required ({pendingUpload.length + pendingApproval.length})
            </div>
            {pendingUpload.map(p=>(
              <div key={p._id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderTop:"0.5px solid rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize:13 }}>
                  You paid <strong>₹{p.amount?.toLocaleString()}</strong> to <strong>{p.to?.name}</strong> — upload your receipt
                </div>
                <button onClick={()=>setReceiptModal(p)}
                  style={{ padding:"6px 14px", background:"#eda100", color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:500, cursor:"pointer", marginLeft:12, whiteSpace:"nowrap" }}>
                  📤 Upload receipt
                </button>
              </div>
            ))}
            {pendingApproval.map(p=>(
              <div key={p._id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderTop:"0.5px solid rgba(0,0,0,0.08)" }}>
                <div style={{ fontSize:13 }}>
                  <strong>{p.from?.name}</strong> paid you <strong>₹{p.amount?.toLocaleString()}</strong> — review and approve
                </div>
                <button onClick={()=>setApproveModal(p)}
                  style={{ padding:"6px 14px", background:"#2a78d6", color:"#fff", border:"none", borderRadius:7, fontSize:12, fontWeight:500, cursor:"pointer", marginLeft:12, whiteSpace:"nowrap" }}>
                  👀 Review & approve
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── You Owe ── */}
        {iOweList.length > 0 && (
          <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:10, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#a32d2d", marginBottom:12 }}>💸 You owe</div>
            {iOweList.map(b => (
              <div key={b.userId} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"0.5px solid #f1f0ec" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"#fcebeb", color:"#a32d2d", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, flexShrink:0 }}>
                  {b.name.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{b.name}</div>
                  <div style={{ fontSize:11, color:"#898781" }}>you owe them</div>
                </div>
                <div style={{ fontSize:16, fontWeight:600, color:"#a32d2d", marginRight:12 }}>
                  ₹{Math.abs(b.amount).toLocaleString()}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <RazorpayButton
                    toUserId={b.userId}
                    toName={b.name}
                    amount={Math.abs(b.amount)}
                    expenseIds={[]}
                    onSuccess={() => { showToast("✅ Paid via Razorpay! Auto settled."); fetchData(); }}
                  />
                  <button
                    onClick={()=>setReceiptModal({ isManualSettle:true, toUserId:b.userId, toName:b.name, amount:Math.abs(b.amount) })}
                    style={{ padding:"6px 14px", background:"#f1f0ec", color:"#52514e", border:"0.5px solid rgba(0,0,0,0.15)", borderRadius:8, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
                    🏦 Settle manually
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Owed to you ── */}
        {owedToMe.length > 0 && (
          <div style={{ background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:10, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#3B6D11", marginBottom:12 }}>💰 Owed to you</div>
            {owedToMe.map(b => (
              <div key={b.userId} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"0.5px solid #f1f0ec" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"#eaf3de", color:"#3B6D11", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, flexShrink:0 }}>
                  {b.name.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{b.name}</div>
                  <div style={{ fontSize:11, color:"#898781" }}>owes you</div>
                </div>
                <div style={{ fontSize:16, fontWeight:600, color:"#3B6D11" }}>
                  ₹{b.amount.toLocaleString()}
                </div>
                {settledUserIds.has(b.userId) && (
                  <span style={{ fontSize:11, background:"#e6f1fb", color:"#185fa5", padding:"3px 10px", borderRadius:20 }}>
                    📋 Payment pending
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── All settled ── */}
        {iOweList.length === 0 && owedToMe.length === 0 && pendingUpload.length === 0 && pendingApproval.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 0", color:"#898781" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>✅</div>
            <div style={{ fontSize:16, fontWeight:500, color:"#52514e" }}>All settled up!</div>
            <div style={{ fontSize:12, marginTop:4 }}>No pending debts</div>
          </div>
        )}

        {/* ── Payment History ── */}
        {payments.length > 0 && (
          <div style={{ marginTop:24 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#52514e", marginBottom:12, paddingBottom:6, borderBottom:"0.5px solid rgba(0,0,0,0.1)" }}>
              📋 Payment history
            </div>
            {payments.map(p => {
              const isFrom = p.from?._id === user._id;
              const s = STATUS[p.status] || STATUS.approved;
              return (
                <div key={p._id} style={{ padding:14, background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:10, marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>
                        {p.from?.name} → {p.to?.name}
                      </div>
                      <div style={{ fontSize:11, color:"#898781", marginTop:2 }}>
                        {p.paymentMode} · {new Date(p.createdAt).toLocaleDateString("en-IN",{dateStyle:"medium"})}
                        {p.razorpayPaymentId && <span style={{ marginLeft:6, background:"#eaf3de", color:"#3B6D11", padding:"1px 6px", borderRadius:4, fontSize:10 }}>Razorpay ✓</span>}
                      </div>
                    </div>
                    <div style={{ fontWeight:600, fontSize:15 }}>₹{p.amount?.toLocaleString()}</div>
                    <span style={{ background:s.bg, color:s.color, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:500, whiteSpace:"nowrap" }}>
                      {s.label}
                    </span>
                  </div>

                  {p.receiptUrl && (
                    <div style={{ marginTop:8, padding:"6px 10px", background:"#f8f7f4", borderRadius:7, display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:11, color:"#52514e" }}>📎 Receipt submitted</span>
                      {p.receiptNote && <span style={{ fontSize:11, color:"#898781" }}>· {p.receiptNote}</span>}
                      <a href={`http://localhost:5000${p.receiptUrl}`} target="_blank" rel="noreferrer" style={{ fontSize:11, color:"#2a78d6", marginLeft:"auto" }}>View →</a>
                    </div>
                  )}

                  <div style={{ display:"flex", gap:8, marginTop:8 }}>
                    {p.status === "pending_receipt" && isFrom && (
                      <button onClick={()=>setReceiptModal(p)}
                        style={{ padding:"5px 12px", background:"#eda100", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:500, cursor:"pointer" }}>
                        📤 Upload receipt
                      </button>
                    )}
                    {p.status === "receipt_submitted" && !isFrom && (
                      <button onClick={()=>setApproveModal(p)}
                        style={{ padding:"5px 12px", background:"#2a78d6", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:500, cursor:"pointer" }}>
                        👀 Review & approve
                      </button>
                    )}
                    {p.status === "approved" && (
                      <button onClick={()=>downloadReceipt(p._id)}
                        style={{ padding:"5px 12px", background:"#f1f0ec", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:6, fontSize:12, cursor:"pointer" }}>
                        📄 Download PDF receipt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>}

      {/* ── Upload Receipt Modal ── */}
      {receiptModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={e=>e.target===e.currentTarget&&setReceiptModal(null)}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:420 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:500 }}>{receiptModal.isManualSettle ? "🏦 Settle manually" : "📤 Upload receipt"}</div>
              <button onClick={()=>setReceiptModal(null)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#898781" }}>✕</button>
            </div>
            <div style={{ background:"#f8f7f4", borderRadius:8, padding:12, marginBottom:14, fontSize:13 }}>
              Paying <strong>₹{receiptModal.amount?.toLocaleString()}</strong> to <strong>{receiptModal.to?.name || receiptModal.toName}</strong>
            </div>
            {receiptModal.isManualSettle && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:8 }}>Payment method</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {["Cash","UPI","Bank transfer","Partial payment"].map(m=>(
                    <div key={m} onClick={()=>setManualMode(m)}
                      style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer", fontWeight:500,
                        background: manualMode===m?"#2a78d6":"#f1f0ec",
                        color:      manualMode===m?"#fff":"#52514e",
                        border:     manualMode===m?"none":"0.5px solid rgba(0,0,0,0.1)" }}>
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:6 }}>Receipt screenshot / PDF <span style={{color:"#e34948"}}>*</span></div>
              <div onClick={()=>fileRef.current.click()}
                style={{ border:"1.5px dashed #2a78d6", borderRadius:8, padding:20, textAlign:"center", cursor:"pointer", background:"#e6f1fb" }}>
                {receiptFile
                  ? <div style={{ fontSize:13, color:"#185fa5" }}>✅ {receiptFile.name}</div>
                  : <><div style={{ fontSize:24, marginBottom:4 }}>📁</div><div style={{ fontSize:12, color:"#52514e" }}>Click to upload (JPG, PNG, PDF · max 5MB)</div></>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={e=>setReceiptFile(e.target.files[0])} />
            </div>
            <input value={receiptNote} onChange={e=>setReceiptNote(e.target.value)} placeholder="Note e.g. GPay txn ID (optional)"
              style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none", marginBottom:12 }} />
            <div style={{ fontSize:11, color:"#898781", background:"#f8f7f4", padding:"8px 12px", borderRadius:8, marginBottom:14 }}>
              📧 {receiptModal.to?.name || receiptModal.toName} will be notified by email to approve.
              Expenses will be locked only <strong>after approval</strong>.
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={()=>setReceiptModal(null)} style={{ padding:"8px 16px", background:"#f1f0ec", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:8, fontSize:13, cursor:"pointer" }}>Cancel</button>
              <button onClick={handleSubmitReceipt} disabled={submitting}
                style={{ padding:"8px 16px", background:submitting?"#898781":"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
                {submitting ? "Submitting…" : "Submit receipt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve / Reject Modal ── */}
      {approveModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={e=>e.target===e.currentTarget&&setApproveModal(null)}>
          <div style={{ background:"#fff", borderRadius:12, padding:24, width:440 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:16, fontWeight:500 }}>👀 Review payment receipt</div>
              <button onClick={()=>setApproveModal(null)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:"#898781" }}>✕</button>
            </div>
            <div style={{ background:"#f8f7f4", borderRadius:8, padding:12, marginBottom:14 }}>
              <div style={{ fontSize:13 }}><strong>{approveModal.from?.name}</strong> says they paid you <strong style={{color:"#2a78d6"}}>₹{approveModal.amount?.toLocaleString()}</strong></div>
              <div style={{ fontSize:11, color:"#898781", marginTop:4 }}>via {approveModal.paymentMode}</div>
            </div>
            {approveModal.receiptUrl ? (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:6 }}>Receipt submitted:</div>
                <a href={`http://localhost:5000${approveModal.receiptUrl}`} target="_blank" rel="noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px", background:"#e6f1fb", color:"#185fa5", borderRadius:8, fontSize:12, textDecoration:"none", fontWeight:500 }}>
                  📎 Open receipt →
                </a>
                {approveModal.receiptNote && <div style={{ fontSize:11, color:"#898781", marginTop:6 }}>Note: {approveModal.receiptNote}</div>}
              </div>
            ) : (
              <div style={{ marginBottom:14, padding:"10px 12px", background:"#fcebeb", borderRadius:8, fontSize:12, color:"#a32d2d" }}>
                ⚠️ No receipt image attached
              </div>
            )}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#52514e", marginBottom:5 }}>Rejection reason <span style={{fontWeight:400,color:"#898781"}}>(fill only if rejecting)</span></div>
              <input value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="e.g. Wrong amount, unclear screenshot"
                style={{ width:"100%", padding:"8px 10px", border:"0.5px solid rgba(0,0,0,0.2)", borderRadius:8, fontSize:13, outline:"none" }} />
            </div>
            <div style={{ fontSize:11, color:"#3B6D11", background:"#eaf3de", padding:"8px 12px", borderRadius:8, marginBottom:16 }}>
              ✅ Approving will lock all linked expenses 🔒 and email PDF receipts to both parties.
            </div>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button onClick={handleReject} disabled={submitting}
                style={{ padding:"8px 16px", background:"#fcebeb", color:"#a32d2d", border:"0.5px solid #e34948", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
                ❌ Reject
              </button>
              <button onClick={handleApprove} disabled={submitting}
                style={{ padding:"8px 16px", background:"#0ca30c", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>
                {submitting ? "Processing…" : "✅ Approve & settle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:16, right:16, background:toast.type==="error"?"#a32d2d":"#0b0b0b", color:"#fff", padding:"10px 16px", borderRadius:8, fontSize:13, zIndex:200 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
