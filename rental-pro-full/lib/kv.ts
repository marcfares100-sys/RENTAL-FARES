const BASE = process.env.KV_REST_API_URL!;
const TOKEN = process.env.KV_REST_API_TOKEN!;
if (!BASE || !TOKEN) {
  console.warn('KV env vars missing. Set KV_REST_API_URL and KV_REST_API_TOKEN.');
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'content-type': 'text/plain; charset=utf-8'
};

export async function kvGet<T>(key: string): Promise<T | null> {
  const r = await fetch(`${BASE}/get/${encodeURIComponent(key)}`, { headers, cache: 'no-store' });
  if (!r.ok) return null;
  const j = await r.json();
  if (!j || j.result == null) return null;
  try { return JSON.parse(j.result) as T; } catch { return j.result as T; }
}

export async function kvSet<T>(key: string, val: T): Promise<void> {
  const body = typeof val === 'string' ? val : JSON.stringify(val);
  const r = await fetch(`${BASE}/set/${encodeURIComponent(key)}`, { method: 'POST', headers, body });
  if (!r.ok) throw new Error('KV set failed: ' + (await r.text()));
}
