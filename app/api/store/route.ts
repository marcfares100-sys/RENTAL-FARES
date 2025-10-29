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
    subId?: string        // sub-property id (unit/floor/etc.)
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

/** Helper: collect all subIds for a given apartment (if any) */
function collectSubIds(apt?: Store['apartments'][number]) {
  return new Set((apt?.sub ?? []).map(s => s.id))
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

    // data: { id, name, purchase }
    case 'addApartment': {
      const data = body.data || {}
      current.apartments.push({ ...data, sub: data.sub ?? [] })
      break
    }

    // data: { id, name?, purchase? }
    case 'updateApartment': {
      const u = body.data || {}
      const apt = current.apartments.find(a => a.id === u.id)
      if (!apt) return NextResponse.json({ error: 'Apartment not found' }, { status: 404 })
      if (typeof u.name === 'string') apt.name = u.name
      if (typeof u.purchase === 'number') apt.purchase = u.purchase
      break
    }

    // id: string
    case 'deleteApartment': {
      const id = String(body.id)
      const apt = current.apartments.find(a => a.id === id)
      if (!apt) return NextResponse.json({ error: 'Apartment not found' }, { status: 404 })

      // Cascade delete: remove ledger rows referencing this apt or any of its subs
      const subIds = collectSubIds(apt)
      current.ledger = current.ledger.filter(
        l => l.apartmentId !== id && (l.subId ? !subIds.has(l.subId) : true)
      )

      // Remove the apartment
      current.apartments = current.apartments.filter(a => a.id !== id)
      break
    }

    // data: { apartmentId, sub: { id, name, purchase? } }
    case 'addSub': {
      const { apartmentId, sub } = body.data || {}
      const apt = current.apartments.find(a => a.id === apartmentId)
      if (!apt) return NextResponse.json({ error: 'Apartment not found' }, { status: 404 })
      apt.sub ??= []
      apt.sub.push({ ...sub })
      break
    }

    // data: { apartmentId, sub: { id, name?, purchase? } }
    case 'updateSub': {
      const { apartmentId, sub } = body.data || {}
      const apt = current.apartments.find(a => a.id === apartmentId)
      if (!apt) return NextResponse.json({ error: 'Apartment not found' }, { status: 404 })
      const s = (apt.sub ?? []).find(x => x.id === sub?.id)
      if (!s) return NextResponse.json({ error: 'Sub not found' }, { status: 404 })
      if (typeof sub.name === 'string') s.name = sub.name
      if (typeof sub.purchase === 'number') s.purchase = sub.purchase
      break
    }

    // { apartmentId, subId }
    case 'deleteSub': {
      const { apartmentId, subId } = body
      const apt = current.apartments.find(a => a.id === apartmentId)
      if (!apt) return NextResponse.json({ error: 'Apartment not found' }, { status: 404 })

      const before = apt.sub?.length ?? 0
      apt.sub = (apt.sub ?? []).filter(s => s.id !== subId)
      if ((apt.sub?.length ?? 0) === before) {
        return NextResponse.json({ error: 'Sub not found' }, { status: 404 })
      }

      // Cascade: remove ledger rows that reference this sub
      current.ledger = current.ledger.filter(l => l.subId !== subId)
      break
    }

    /** ---------
     * Tenants
     * --------- */

    case 'addTenant': {
      current.tenants.push(body.data)
      break
    }

    // data: { id, name? }
    case 'updateTenant': {
      const u = body.data || {}
      const t = current.tenants.find(tt => tt.id === u.id)
      if (!t) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      if (typeof u.name === 'string') t.name = u.name
      break
    }

    // id: string
    case 'deleteTenant': {
      const id = String(body.id)
      const existed = current.tenants.some(t => t.id === id)
      current.tenants = current.tenants.filter(t => t.id !== id)
      if (!existed) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

      // Cascade: remove ledger rows for this tenant
      current.ledger = current.ledger.filter(l => l.tenantId !== id)
      break
    }

    /** ----------
     * Ledger
     * ---------- */

    // data: { id, date, apartmentId?, subId?, tenantId?, type, amount, from?, to?, note? }
    case 'addLedger': {
      current.ledger.push(body.data)
      break
    }

    // data: full row with id (partial updates allowed)
    case 'updateLedger': {
      const updated = body.data || {}
      const i = current.ledger.findIndex(l => l.id === updated.id)
      if (i === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      current.ledger[i] = { ...current.ledger[i], ...updated }
      break
    }

    // id: string
    case 'deleteLedger': {
      const id = String(body.id)
      const before = current.ledger.length
      current.ledger = current.ledger.filter(l => l.id !== id)
      if (current.ledger.length === before) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
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
