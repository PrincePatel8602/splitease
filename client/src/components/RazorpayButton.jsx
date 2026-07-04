import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function RazorpayButton({ toUserId, toName, amount, expenseIds = [], onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { data: order } = await axios.post("/api/razorpay/create-order", {
        amount, toUserId, expenseIds,
      });

      if (!window.Razorpay) await loadRazorpayScript();

      const options = {
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        "SplitEase",
        description: `Pay ₹${amount} to ${toName}`,
        order_id:    order.orderId,
        handler: async (response) => {
          try {
            const { data } = await axios.post("/api/razorpay/verify", {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              toUserId, amount, expenseIds,
            });
            onSuccess?.(data.payment);
          } catch (err) {
            alert("Verification failed: " + (err.response?.data?.error || err.message));
          }
        },
        prefill:  { name: user?.name || "", email: user?.email || "" },
        theme:    { color: "#2a78d6" },
        modal:    { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (r) => {
        alert("Payment failed: " + r.error.description);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  return (
    <button onClick={handlePay} disabled={loading}
      style={{ padding:"8px 18px", background: loading?"#898781":"#2a78d6", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor: loading?"not-allowed":"pointer" }}>
      {loading ? "⏳ Opening..." : `💳 Pay ₹${amount?.toLocaleString()}`}
    </button>
  );
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}