import { Link } from "react-router-dom";
import { useCart } from "../cartContext";

export function CartPage() {
  const { lines, setQty, remove, totalPaise } = useCart();
  if (!lines.length) {
    return (
      <div className="page panel panel--narrow">
        <header className="page-header">
          <span className="eyebrow">Your selection</span>
          <h2>Your cart</h2>
          <p>Your cart is empty. Discover our collection of fine timepieces.</p>
        </header>
        <Link to="/" className="btn btn-primary">
          Browse collection
        </Link>
      </div>
    );
  }
  return (
    <div className="page panel">
      <header className="page-header">
        <span className="eyebrow">Your selection</span>
        <h2>Your cart</h2>
      </header>
      <table className="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.product.id}>
              <td>
                <Link to={`/p/${l.product.slug}`}>{l.product.title}</Link>
              </td>
              <td>
                <input
                  type="number"
                  min={1}
                  max={l.product.stock}
                  value={l.qty}
                  onChange={(e) => setQty(l.product.id, Number(e.target.value))}
                />
              </td>
              <td className="price">₹{((l.product.price_paise * l.qty) / 100).toLocaleString("en-IN")}</td>
              <td>
                <button type="button" className="btn btn-ghost" onClick={() => remove(l.product.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="cart-total">
        Total: <strong>₹{(totalPaise / 100).toLocaleString("en-IN")}</strong>
      </p>
      <Link to="/checkout" className="btn btn-primary">
        Proceed to checkout
      </Link>
    </div>
  );
}
