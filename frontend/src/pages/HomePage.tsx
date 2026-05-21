import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet } from "../api";
import type { Product } from "../types";

function mediaUrl(path: string) {
  if (path.startsWith("http")) return path;
  return path;
}

export function HomePage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    apiGet<Product[]>("/api/products")
      .then(setProducts)
      .catch((e) => setErr(String(e.message || e)));
  }, []);

  if (err) return <p className="err">{err}</p>;
  if (!products) return <p className="loading">Curating the collection…</p>;

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">Heritage & precision</span>
          <h1>Timeless watches for every occasion</h1>
          <p className="hero-lead">
            Explore our handpicked collection. Add to cart, verify with OTP, and pay by cash on delivery or UPI.
          </p>
        </div>
        <aside className="hero-aside">
          <p>“A watch is more than an instrument — it is a statement of character.”</p>
          <ul className="hero-features">
            <li>Secure OTP checkout</li>
            <li>Cash on delivery available</li>
            <li>UPI & cards via Razorpay</li>
          </ul>
        </aside>
      </section>

      <div className="section-head">
        <h2>Our collection</h2>
      </div>

      <div className="grid">
        {products.map((p) => (
          <Link key={p.id} to={`/p/${p.slug}`} className="card">
            <div className="card-img">
              {p.images[0] ? (
                <img src={mediaUrl(p.images[0])} alt={p.title} loading="lazy" />
              ) : (
                <span>No image</span>
              )}
            </div>
            <div className="card-body">
              <span className="card-brand">New Fashion Watch</span>
              <div className="card-title">{p.title}</div>
              <div className="card-meta">
                <span className="price">₹{(p.price_paise / 100).toLocaleString("en-IN")}</span>
                <span className={`badge ${p.stock > 0 ? "badge--in" : ""}`}>
                  {p.stock > 0 ? "In stock" : "Sold out"}
                </span>
              </div>
              <span className="card-cta">View details</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
