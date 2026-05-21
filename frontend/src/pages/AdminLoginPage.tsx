import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPost } from "../api";
import "../styles.css";

const KEY = "watchshop_admin_token";

export function AdminLoginPage() {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      const r = await apiPost<{ token: string }>("/api/admin/login", { username: u, password: p });
      localStorage.setItem(KEY, r.token);
      nav("/admin/panel");
    } catch {
      setErr("Invalid login");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-panel admin-login">
        <h2>Admin login</h2>
        <p className="admin-login-note">
          Shop owner access only. Customers use the main site — no account required.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label>Username</label>
            <input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {err ? <p className="err">{err}</p> : null}
          <button type="submit" className="btn btn-primary">
            Sign in
          </button>
        </form>
        <Link to="/" className="admin-back-link">
          ← Back to customer site
        </Link>
      </div>
    </div>
  );
}

export function getAdminToken(): string | null {
  return localStorage.getItem(KEY);
}

export function clearAdminToken() {
  localStorage.removeItem(KEY);
}
