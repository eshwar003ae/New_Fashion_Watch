import { Link, NavLink, Outlet } from "react-router-dom";
import { useCart } from "./cartContext";
import "./styles.css";

export function Layout() {
  const { count } = useCart();
  return (
    <div className="app">
      <div className="promo-bar">
        Complimentary delivery on orders above ₹2,999 · Cash on delivery & UPI
      </div>
      <header className="header">
        <Link to="/" className="logo-wrap">
          <span className="logo">Watch Shop</span>
          <span className="logo-tagline">Fine timepieces</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Collection
          </NavLink>
          <NavLink to="/cart">Cart {count ? `(${count})` : ""}</NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-brand">Watch Shop</div>
            <p className="footer-tagline">
              Curated watches with secure checkout, OTP verification, and flexible payment options.
            </p>
          </div>
          <div className="footer-col">
            <h4>Shop</h4>
            <ul>
              <li>
                <Link to="/">All watches</Link>
              </li>
              <li>
                <Link to="/cart">Your cart</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Service</h4>
            <ul>
              <li>Cash on delivery</li>
              <li>UPI & card via Razorpay</li>
              <li>No account required</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">© {new Date().getFullYear()} Watch Shop · Crafted for timeless style</div>
      </footer>
    </div>
  );
}
