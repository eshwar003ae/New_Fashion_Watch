import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiBase, apiPost } from "../api";
import { useCart } from "../cartContext";
import type { Order } from "../types";

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
};

declare global {
  interface Window {
    Razorpay: new (o: RazorpayOptions) => { open: () => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Razorpay script failed"));
    document.body.appendChild(s);
  });
}

export function CheckoutPage() {
  const nav = useNavigate();
  const { lines, totalPaise, clear } = useCart();
  const items = useMemo(
    () => lines.map((l) => ({ product_id: l.product.id, qty: l.qty })),
    [lines]
  );

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [checkoutToken, setCheckoutToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pin, setPin] = useState("");
  const [payMode, setPayMode] = useState<"cod" | "online">("cod");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!lines.length) {
    return (
      <div>
        <h2>Checkout</h2>
        <p className="muted">Add items to cart first.</p>
      </div>
    );
  }

  const addrBody = () => ({
    phone,
    customer_name: name,
    email,
    address_line1: line1,
    address_line2: line2,
    city,
    state,
    pincode: pin,
    items,
  });

  const sendOtp = async () => {
    setErr("");
    setBusy(true);
    try {
      await apiPost("/api/otp/request", { phone });
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    setErr("");
    setBusy(true);
    try {
      const r = await apiPost<{ checkout_token: string }>("/api/otp/verify", { phone, code: otp });
      setCheckoutToken(r.checkout_token);
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const placeCod = async () => {
    setErr("");
    setBusy(true);
    try {
      const r = await apiPost<{ order: Order }>("/api/orders/cod", addrBody(), {
        Authorization: `Bearer ${checkoutToken}`,
      });
      clear();
      nav("/thanks", { state: { order: r.order } });
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const payOnline = async () => {
    setErr("");
    setBusy(true);
    try {
      await loadRazorpay();
      const ro = await apiPost<{
        key_id: string;
        amount_paise: number;
        currency: string;
        razorpay_order_id: string;
      }>("/api/payments/razorpay/create-order", { phone, items }, { Authorization: `Bearer ${checkoutToken}` });

      const rzp = new window.Razorpay({
        key: ro.key_id,
        amount: ro.amount_paise,
        currency: ro.currency,
        name: "Watch Shop",
        description: "Order payment",
        order_id: ro.razorpay_order_id,
        handler: async (res) => {
          setBusy(true);
          try {
            const body = {
              ...addrBody(),
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
            };
            const out = await apiPost<{ order: Order }>("/api/orders/online-confirm", body, {
              Authorization: `Bearer ${checkoutToken}`,
            });
            clear();
            nav("/thanks", { state: { order: out.order } });
          } catch (e) {
            setErr(String((e as Error).message));
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
        theme: { color: "#5c4033" },
      });
      setBusy(false);
      rzp.open();
    } catch (e) {
      setErr(String((e as Error).message));
      setBusy(false);
    }
  };

  return (
    <div className="page panel panel--narrow">
      <header className="page-header">
        <span className="eyebrow">Secure checkout</span>
        <h2>Checkout</h2>
        <p>Verify your phone with OTP, then enter delivery details.</p>
      </header>
      {err ? <p className="err">{err}</p> : null}

      <div className="field">
        <label>Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={sendOtp}>
          Send OTP
        </button>
      </div>
      <div className="field">
        <label>OTP</label>
        <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" />
      </div>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={verifyOtp}>
        Verify OTP
      </button>
      {checkoutToken ? <p className="success" style={{ marginTop: "0.75rem" }}>Phone verified.</p> : null}

      <hr className="divider" />

      <h3>Delivery</h3>
      <div className="field">
        <label>Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Email (optional)</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label>Address line 1</label>
        <input value={line1} onChange={(e) => setLine1(e.target.value)} />
      </div>
      <div className="field">
        <label>Address line 2</label>
        <input value={line2} onChange={(e) => setLine2(e.target.value)} />
      </div>
      <div className="field">
        <label>City</label>
        <input value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div className="field">
        <label>State</label>
        <input value={state} onChange={(e) => setState(e.target.value)} />
      </div>
      <div className="field">
        <label>Pincode</label>
        <input value={pin} onChange={(e) => setPin(e.target.value)} />
      </div>

      <h3>Payment</h3>
      <div className="field">
        <label>Mode</label>
        <select value={payMode} onChange={(e) => setPayMode(e.target.value as "cod" | "online")}>
          <option value="cod">Cash on delivery</option>
          <option value="online">UPI / Card / Netbanking (Razorpay)</option>
        </select>
      </div>
      <p>
        Order total: <strong>₹{(totalPaise / 100).toLocaleString("en-IN")}</strong>
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !checkoutToken}
          onClick={() => (payMode === "cod" ? placeCod() : payOnline())}
        >
          {payMode === "cod" ? "Place order (COD)" : "Pay securely"}
        </button>
      </div>
      <p className="muted canvas-note" style={{ marginTop: "1.5rem" }}>
        API: <code>{apiBase() || "(same origin /api)"}</code> — configure Razorpay keys on the server for online pay.
      </p>
    </div>
  );
}
