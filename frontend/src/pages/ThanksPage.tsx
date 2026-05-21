import { Link, useLocation } from "react-router-dom";
import type { Order } from "../types";

export function ThanksPage() {
  const loc = useLocation() as { state?: { order?: Order } };
  const order = loc.state?.order;
  if (!order) {
    return (
      <div className="page panel panel--narrow">
        <header className="page-header">
          <h2>Thank you</h2>
          <p className="muted">No order in session.</p>
        </header>
        <Link to="/" className="btn btn-primary">
          Return to collection
        </Link>
      </div>
    );
  }
  return (
    <div className="page panel panel--narrow">
      <header className="page-header">
        <span className="eyebrow">Order confirmed</span>
        <h2>Thank you for your order</h2>
      </header>
      <p className="success">
        Your order ID is <strong>{order.public_id}</strong>
      </p>
      <p>
        We sent details by SMS (and email if configured). Total{" "}
        <strong>₹{(order.total_paise / 100).toLocaleString("en-IN")}</strong>.
      </p>
      <h4>Items</h4>
      <ul className="stack">
        {order.items.map((i) => (
          <li key={`${i.product_id}-${i.title}`}>
            {i.title} × {i.qty} — ₹{(i.line_total_paise / 100).toLocaleString("en-IN")}
          </li>
        ))}
      </ul>
      <Link to="/" className="btn btn-primary">
        Continue shopping
      </Link>
    </div>
  );
}
