import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiBase, apiDelete, apiGet, apiPost, apiPostForm, apiPut } from "../api";
import type { Order, Product } from "../types";
import { clearAdminToken, getAdminToken } from "./AdminLoginPage";

type AdminProduct = Product & { active?: boolean };

export function AdminPanelPage() {
  const token = getAdminToken();
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [err, setErr] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("4999");
  const [stock, setStock] = useState("5");

  const auth = token ? { Authorization: `Bearer ${token}` } : undefined;

  const reloadProducts = async () => {
    const list = await apiGet<AdminProduct[]>("/api/admin/products", auth);
    setProducts(list);
  };

  useEffect(() => {
    if (!token) return;
    reloadProducts().catch(() => setErr("Unauthorized — login again"));
  }, [token]);

  useEffect(() => {
    if (!token || tab !== "orders") return;
    apiGet<Order[]>("/api/admin/orders", auth)
      .then(setOrders)
      .catch(() => setErr("Could not load orders"));
  }, [token, tab]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDesc("");
    setPrice("4999");
    setStock("5");
  };

  const startEdit = (p: AdminProduct) => {
    setEditingId(p.id);
    setTitle(p.title);
    setDesc(p.description);
    setPrice(String(p.price_paise / 100));
    setStock(String(p.stock));
    setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!token) {
    return (
      <div className="admin-page">
        <div className="admin-panel admin-login">
          <p>
            <Link to="/admin">Login</Link> required.
          </p>
          <Link to="/" className="admin-back-link">
            ← Back to customer site
          </Link>
        </div>
      </div>
    );
  }

  const saveProduct = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    const body = {
      title,
      description: desc,
      price_rupees: Number(price),
      stock: Number(stock),
      active: true,
    };
    try {
      if (editingId) {
        await apiPut(`/api/admin/products/${editingId}`, body, auth);
      } else {
        await apiPost("/api/admin/products", body, auth);
      }
      resetForm();
      await reloadProducts();
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  const removeProduct = async (p: AdminProduct) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setErr("");
    try {
      await apiDelete(`/api/admin/products/${p.id}`, auth);
      if (editingId === p.id) resetForm();
      await reloadProducts();
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  const uploadImage = async (pid: number, file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await apiPostForm(`/api/admin/products/${pid}/images`, fd, token!);
      await reloadProducts();
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  const uploadVideo = async (pid: number, file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      await apiPostForm(`/api/admin/products/${pid}/video`, fd, token!);
      await reloadProducts();
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  const removeVideo = async (pid: number) => {
    if (!window.confirm("Remove this product video?")) return;
    try {
      await apiDelete(`/api/admin/products/${pid}/video`, auth);
      await reloadProducts();
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  return (
    <div className="admin-shell">
      <div className="admin-shell-inner">
        <div className="btn-row" style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            className={`btn ${tab === "products" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("products")}
          >
            Products
          </button>
          <button
            type="button"
            className={`btn ${tab === "orders" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("orders")}
          >
            Orders
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              clearAdminToken();
              window.location.href = "/admin";
            }}
          >
            Logout
          </button>
        </div>
        {err ? <p className="err">{err}</p> : null}

        {tab === "products" ? (
          <div className="admin-panel">
            {editingId ? (
              <p className="admin-edit-banner">
                Editing product #{editingId} — change fields below and click <strong>Save changes</strong>, or{" "}
                <button type="button" className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem" }} onClick={resetForm}>
                  Cancel
                </button>
              </p>
            ) : null}
            <h3 style={{ marginTop: 0 }}>{editingId ? "Edit product" : "Add product"}</h3>
            <form onSubmit={saveProduct}>
              <div className="field">
                <label>Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <div className="field">
                <label>Price (₹)</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" />
              </div>
              <div className="field">
                <label>Stock</label>
                <input value={stock} onChange={(e) => setStock(e.target.value)} type="number" />
              </div>
              <div className="btn-row">
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Save changes" : "Create"}
                </button>
                {editingId ? (
                  <button type="button" className="btn btn-ghost" onClick={resetForm}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <h3>Catalog</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>₹</th>
                  <th>Stock</th>
                  <th>Image</th>
                  <th>Video</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.title}</td>
                    <td>{(p.price_paise / 100).toFixed(2)}</td>
                    <td>{p.stock}</td>
                    <td className="admin-upload-cell">
                      <span className="admin-upload-label">Upload image</span>
                      <input type="file" accept="image/*" onChange={(e) => uploadImage(p.id, e.target.files?.[0] || null)} />
                      {p.images.length > 0 ? (
                        <span className="muted" style={{ fontSize: "0.75rem" }}>
                          {p.images.length} image(s)
                        </span>
                      ) : null}
                    </td>
                    <td className="admin-upload-cell">
                      <span className="admin-upload-label">Upload video</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.ogg"
                        onChange={(e) => uploadVideo(p.id, e.target.files?.[0] || null)}
                      />
                      {p.video_url ? (
                        <button type="button" className="btn btn-ghost" style={{ padding: "0.2rem 0.5rem", marginTop: "0.25rem" }} onClick={() => removeVideo(p.id)}>
                          Remove video
                        </button>
                      ) : (
                        <span className="muted" style={{ fontSize: "0.75rem" }}>No video</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button type="button" className="btn btn-ghost" onClick={() => startEdit(p)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-danger" onClick={() => removeProduct(p)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-panel">
            <h3 style={{ marginTop: 0 }}>Recent orders</h3>
            {orders.map((o) => (
              <div key={o.public_id} style={{ borderBottom: "1px solid var(--border)", padding: "0.75rem 0" }}>
                <strong>{o.public_id}</strong> · {o.customer_name} · {o.phone} · ₹{(o.total_paise / 100).toFixed(2)} ·{" "}
                {o.payment_mode} / {o.payment_status}
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {o.items.map((i, idx) => (
                    <span key={`${o.public_id}-${idx}-${i.product_id}`}>
                      {i.title}×{i.qty}{" "}
                    </span>
                  ))}
                </div>
                <div className="muted" style={{ fontSize: "0.85rem" }}>
                  {o.address.line1}, {o.address.city}, {o.address.pincode}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "1rem" }}>
          Uploads served from <code>{apiBase() || ""}/api/media/…</code>
        </p>
        <Link to="/" className="admin-back-link">
          ← Back to customer site
        </Link>
      </div>
    </div>
  );
}
