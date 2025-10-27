// app/api/store/route.ts
import { kvGet, kvSet } from '@/lib/kv'
import { NextResponse } from 'next/server'

const STORE_KEY = 'rental:store:v1'

export type Store = {
  currency: string
  apartments: Array<{
    id: string
    name: string
    purchase: number
    sub?: Array<{ id: string; name: string; purchase?: number }>
  }>
  tenants: Array<{ id: string; name: string }>
  ledger: Array<{
    id: string
    date: string // YYYY-MM-DD
    apartmentId?: string
    subId?: string       // NEW: sub-property id (unit/floor/etc.)
    tenantId?: string
    type: 'RENT' | 'DEPOSIT' | 'EXPENSE' | 'REFUND'
    amount: number
    from?: string // YYYY-MM-DD
    to?: string   // YYYY-MM-DD
    note?: string
  }>
}

const defaultStore: Store = { currency: 'USD', apartments: [], tenants: [], ledger: [] }

async function getStore(): Promise<Store> {
  return (await kvGet<Store>(STORE_KEY)) ?? structuredClone(defaultStore)
}
async function saveStore(s: Store) {
  await kvSet(STORE_KEY, s)
}

export async function GET() {
  const data = await getStore()
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const current = await getStore()

  switch (body.action) {
    /** -------------------------
     * Apartments & Sub-properties
     * ------------------------- */
    case 'addApartment': {
      // data: { id, name, purchase }
      current.apartments.push(body.data)
      break
    }
    case 'updateApartment': {
      // data: { id, ...partial }
      const u = body.data
      const i = current.apartments.findIndex(a => a.id === u.id)
      if (i === -1) return NextResponse.json({ error: 'Apartment not found' }, { status: 404 })
      current.apartments[i] = { ...current.apartments[i], ...u }
      break
    }
    case 'deleteApartment': {
      // id: string
      const id = String(body.id)
      const before = current.apartments.length
      current.apartments = current.apartments.filter(a => a.id !== id)
      if (current.apartments.length === before) {
        return NextResponse.json({ error: 'Apartment not found' }, { status: 404 })
      }
      // also clear ledger entries tied to this apartment
      current.ledger = current.ledger.filter(l => l.apartmentId !== id)
      break
    }
    case 'addSub': {
      // data: { apartmentId, sub: { id, name, purchase? } }
      const { apartmentId, sub } = body.data || {}
      const apt = current.apartments.find(a => a.id === apartmentId)
      if (!apt) return NextResponse.json({ error: 'Apartment not found' }, { status: 404 })
      if (!apt.sub) apt.sub = []
      apt.sub.push(sub)
      break
    }

    /** ---------
     * Tenants
     * --------- */
    case 'addTenant': {
      current.tenants.push(body.data)
      break
    }
    case 'updateTenant': {
      // data: { id, ...partial }
      const u = body.data
      const i = current.tenants.findIndex(t => t.id === u.id)
      if (i === -1) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      current.tenants[i] = { ...current.tenants[i], ...u }
      break
    }
    case 'deleteTenant': {
      // id: string
      const id = String(body.id)
      const before = current.tenants.length
      current.tenants = current.tenants.filter(t => t.id !== id)
      if (current.tenants.length === before) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      }
      // also clear ledger entries tied to this tenant
      current.ledger = current.ledger.filter(l => l.tenantId !== id)
      break
    }

    /** ----------
     * Ledger
     * ---------- */
    case 'addLedger': {
      // data includes optional subId now
      current.ledger.push(body.data)
      break
    }
    case 'updateLedger': {
      const updated = body.data // full row with id
      const i = current.ledger.findIndex(l => l.id === updated.id)
      if (i === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      current.ledger[i] = { ...current.ledger[i], ...updated }
      break
    }
    case 'deleteLedger': {
      const id = String(body.id)
      const before = current.ledger.length
      current.ledger = current.ledger.filter(l => l.id !== id)
      if (current.ledger.length === before)
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      break
    }

    /** ----------
     * Bulk replace
     * ---------- */
    case 'replaceAll': {
      if (body.data) Object.assign(current, body.data)
      break
    }

    default:
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  await saveStore(current)
  return NextResponse.json({ ok: true })
}
