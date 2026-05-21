# Watch Shop (monorepo)

Single-admin watch store: React + React Three Fiber storefront, Flask + SQLite API, OTP checkout, COD + Razorpay, SMS/email hooks.

## Run locally

**1. Backend** (from `backend/`)

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit secrets, Razorpay, ADMIN_*, optional MSG91/SMTP
python run.py
```

API listens on `http://127.0.0.1:5000`. OTP codes are printed in the terminal when SMS is not configured.

**2. Frontend** (from `frontend/`)

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the Flask server.

- **Store (customers):** `http://localhost:5173/` — catalog, cart, checkout (no login)
- **Admin (you only):** `http://localhost:5173/admin` — not shown in the shop menu; bookmark this URL

### Admin URL (local vs live host)

| Where you run the site | Customer shop | Admin login |
|------------------------|---------------|-------------|
| **On your PC (dev)** | http://localhost:5173 | http://localhost:5173/admin |
| **Live website (example)** | https://your-shop.com | https://your-shop.com/admin |

- `localhost` = only works on **your computer** while `npm run dev` is running.
- After you **host** the site (Vercel, Netlify, etc.), replace `localhost:5173` with your real domain, e.g. `https://watchshop.vercel.app/admin`.
- Customers never see the admin link; only you open `/admin` directly or from a bookmark.
- After you sign in once, you stay logged in for several days (until **Logout** or the session expires). You do not need to type the password on every visit unless you logged out or cleared browser data.

Credentials: `backend/.env` → `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

Production: set `VITE_API_URL` to your Render API URL; set `CORS_ORIGINS` on Flask to your Vercel domain. Use real Razorpay keys and optional MSG91 / SMTP for notifications.
