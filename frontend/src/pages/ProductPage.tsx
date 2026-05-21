import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiGet } from "../api";
import { useCart } from "../cartContext";
import type { Product } from "../types";
import { WatchShowcase } from "../components/WatchShowcase";

function mediaUrl(path: string) {
  if (path.startsWith("http")) return path;
  return path;
}

export function ProductPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { add } = useCart();
  const [p, setP] = useState<Product | null>(null);
  const [err, setErr] = useState("");
  const [img, setImg] = useState(0);

  useEffect(() => {
    if (!slug) return;
    apiGet<Product>(`/api/products/${encodeURIComponent(slug)}`)
      .then(setP)
      .catch(() => setErr("Product not found"));
  }, [slug]);

  if (err) return <p className="err">{err}</p>;
  if (!p) return <p className="loading">Loading timepiece…</p>;

  const mainImg = p.images[img] || "";

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/">Collection</Link> / {p.title}
      </p>
      <div className="pdp">
        <div>
          <div className="pdp-gallery">
            {mainImg ? (
              <img src={mediaUrl(mainImg)} alt={p.title} />
            ) : (
              <div className="muted" style={{ padding: "3rem", textAlign: "center" }}>
                No photos yet
              </div>
            )}
          </div>
          {p.images.length > 1 && (
            <div className="thumb-row">
              {p.images.map((u, i) => (
                <button
                  type="button"
                  key={u}
                  className={`thumb-btn ${i === img ? "active" : ""}`}
                  onClick={() => setImg(i)}
                >
                  <img src={mediaUrl(u)} alt="" />
                </button>
              ))}
            </div>
          )}
          {p.video_url ? (
            <video className="pdp-video" src={mediaUrl(p.video_url)} controls playsInline>
              Your browser does not support video playback.
            </video>
          ) : null}
          <WatchShowcase />
          <p className="canvas-note">Drag the 3D preview to rotate (decorative model).</p>
        </div>
        <div className="pdp-info">
          <span className="eyebrow">New Fashion Watch</span>
          <h1>{p.title}</h1>
          <div className="pdp-price">₹{(p.price_paise / 100).toLocaleString("en-IN")}</div>
          <p className={`badge ${p.stock > 0 ? "badge--in" : ""}`}>
            {p.stock > 0 ? `In stock · ${p.stock} available` : "Currently unavailable"}
          </p>
          <p className="pdp-desc">{p.description}</p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" disabled={p.stock < 1} onClick={() => add(p, 1)}>
              Add to cart
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={p.stock < 1}
              onClick={() => {
                add(p, 1);
                nav("/checkout");
              }}
            >
              Buy now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
