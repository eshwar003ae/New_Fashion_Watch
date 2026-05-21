export function apiBase(): string {
  const v = import.meta.env.VITE_API_URL;
  if (v) return v.replace(/\/$/, "");
  return "";
}

export async function apiGet<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const r = await fetch(`${apiBase()}${path}`, { headers });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const r = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = await r.text();
    try {
      const j = JSON.parse(msg);
      msg = j.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const r = await fetch(`${apiBase()}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let msg = await r.text();
    try {
      const j = JSON.parse(msg);
      msg = j.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

export async function apiDelete(path: string, headers?: Record<string, string>): Promise<void> {
  const r = await fetch(`${apiBase()}${path}`, { method: "DELETE", headers });
  if (!r.ok) {
    let msg = await r.text();
    try {
      const j = JSON.parse(msg);
      msg = j.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}

export async function apiPostForm<T>(
  path: string,
  form: FormData,
  token: string
): Promise<T> {
  const r = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}
