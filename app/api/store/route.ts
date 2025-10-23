// app/api/store/route.ts
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

async function getStore(): Promise<Store> {
  return (await kvGet<Store>(STORE_KEY)) ?? structuredClone(defaultStore);
}
async function saveStore(s: Store) {
  await kvSet(STORE_KEY, s);
}

export async function GET() {
  const data = await getStore();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const current = await getStore();

  switch (body.action) {
    case 'addApartment': {
      current.apartments.push(body.data);
      break;
    }
    case 'addTenant': {
      current.tenants.push(body.data);
      break;
    }
    case 'addLedger': {
      current.ledger.push(body.data);
      break;
    }
    case 'updateLedger': {
      const updated = body.data; // full row with id
      const i = current.ledger.findIndex(l => l.id === updated.id);
      if (i === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      current.ledger[i] = { ...current.ledger[i], ...updated };
      break;
    }
    case 'deleteLedger': {
      const id = String(body.id);
      const before = current.ledger.length;
      current.ledger = current.ledger.filter(l => l.id !== id);
      if (current.ledger.length === before)
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      break;
    }
    case 'replaceAll': {
      if (body.data) Object.assign(current, body.data);
      break;
    }
    default:
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  await saveStore(current);
  return NextResponse.json({ ok: true });
}
