import { kvGet, kvSet } from '@/lib/kv';
import { NextResponse } from 'next/server';

const STORE_KEY = 'rental:store:v1';

export type Store = {
  currency: string;
  apartments: Array<{ id: string; name: string; purchase: number }>;
  tenants: Array<{ id: string; name: string }>;
  ledger: Array<{
    id: string;
    date: string; // YYYY-MM-DD
    apartmentId?: string;
    tenantId?: string;
    type: 'RENT' | 'DEPOSIT' | 'EXPENSE' | 'REFUND';
    amount: number;
    from?: string; // YYYY-MM-DD
    to?: string;   // YYYY-MM-DD
    note?: string;
  }>;
};

const defaultStore: Store = { currency: 'USD', apartments: [], tenants: [], ledger: [] };

export async function GET() {
  const data = (await kvGet<Store>(STORE_KEY)) ?? defaultStore;
  return NextResponse.json(data);
}

// Accepts either a full store OR an "action" to add items;
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const current = (await kvGet<Store>(STORE_KEY)) ?? structuredClone(defaultStore);

  if (body.action === 'addApartment') {
    current.apartments.push(body.data);
  } else if (body.action === 'addTenant') {
    current.tenants.push(body.data);
  } else if (body.action === 'addLedger') {
    current.ledger.push(body.data);
  } else if (body.action === 'replaceAll' && body.data) {
    Object.assign(current, body.data);
  } else {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await kvSet(STORE_KEY, current);
  return NextResponse.json({ ok: true });
}
