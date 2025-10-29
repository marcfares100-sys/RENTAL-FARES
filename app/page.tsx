// app/page.tsx
import { kvGet } from '@/lib/kv';
import type { Store } from './api/store/route';
import { Money, Section } from '@/components/UI';

const STORE_KEY = 'rental:store:v1';

export default async function Page() {
  const store =
    (await kvGet<Store>(STORE_KEY)) ?? {
      currency: 'USD',
      apartments: [],
      tenants: [],
      ledger: [],
    };

  const currency = store.currency ?? 'USD';
  const { rent, dep, exp, net } = summarizeTotals(store);
  const roiRows = computeROIByApartment(store);     // <-- NEW
  const coverage = computeCoverage(store);          // <-- unchanged API (but works with subs)

  return (
    <main className="row">
      {/* Totals */}
      <Section title="Totals">
        <div style={{ display: 'grid', gap: 8 }}>
          <div> Total Rent<br/><Money n={rent} currency={currency} /></div>
          <div> Expenses<br/><Money n={exp} currency={currency} /></div>
          <div> Deposits<br/><Money n={dep} currency={currency} /></div>
          <div> Net<br/><Money n={net} currency={currency} /></div>
          <div style={{ marginTop: 12 }}><a className="btn" href="/add">Add entries</a></div>
        </div>
      </Section>

      {/* ROI (aggregated by parent property, including subs) */}
      <Section title="ROI by Property">
        {roiRows.length === 0 ? (
          <p>No properties yet. Add from <a href="/properties">Properties</a> or <a href="/add">Adding</a>.</p>
        ) : (
          <table className="rtable">
            <thead>
              <tr>
                <th>Property</th><th>Income (12m)</th><th>Expenses (12m)</th><th>Net</th><th>Purchase</th><th>Paid Until</th><th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {roiRows.map(row => {
                const netVal = row.income - row.expense;
                const roi = row.purchase ? netVal / row.purchase : 0;

                const best = coverage
                  .filter(c => c.apartmentId === row.id)
                  .sort((a, b) => (b.to || '').localeCompare(a.to || ''))[0];

                return (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td><Money n={row.income} currency={currency} /></td>
                    <td><Money n={row.expense} currency={currency} /></td>
                    <td><Money n={netVal} currency={currency} /></td>
                    <td><Money n={row.purchase} currency={currency} /></td>
                    <td>{best?.to ? fmtLong(best.to) : '—'}</td>
                    <td>{(roi * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* Due & Late (unchanged display; already supports “Paid Until” + status) */}
      <Section title="Due & Late">
        {coverage.length === 0 ? (
          <p>No rent coverage entries yet.</p>
        ) : (
          <table className="rtable">
            <thead>
              <tr><th>Apartment</th><th>Tenant</th><th>Paid Until</th><th>Status</th></tr>
            </thead>
            <tbody>
              {coverage
                .sort((a, b) => a.daysLeft - b.daysLeft)
                .map(row => (
                  <tr key={row.key}>
                    <td>{row.apartmentName || '—'}</td>
                    <td>{row.tenantName || '—'}</td>
                    <td>{row.to ? fmtLong(row.to) : '—'}</td>
                    <td>
                      {row.to ? (
                        row.daysLeft >= 0 ? (
                          <span className="badge success">OK ({row.daysLeft} {row.daysLeft === 1 ? 'day' : 'days'} left)</span>
                        ) : (
                          <span className="badge danger">OVERDUE ({Math.abs(row.daysLeft)} {Math.abs(row.daysLeft) === 1 ? 'day' : 'days'})</span>
                        )
                      ) : (
                        <span className="badge warn">No coverage</span>
                      )}
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </main>
  );
}

/* ---------- helpers ---------- */

function summarizeTotals(store: Store) {
  const sum = (f: (x: any) => number) => store.ledger.reduce((a, b) => a + f(b), 0);
  const rent = sum(l => (l.type === 'RENT' ? l.amount : 0));
  const dep = sum(l => (l.type === 'DEPOSIT' ? l.amount : 0));
  const exp = sum(l => (l.type === 'EXPENSE' ? l.amount : 0));
  const net = rent - exp;
  return { rent, dep, exp, net };
}

/** Aggregate income/expense per PARENT apartment (includes entries with any subId). */
function computeROIByApartment(store: Store) {
  type Row = { id: string; name: string; income: number; expense: number; purchase: number };
  const rows: Row[] = store.apartments.map(a => {
    const subs = a.sub ?? [];
    const subPurchase = subs.reduce((s, x) => s + (x.purchase || 0), 0);
    return { id: a.id, name: a.name, income: 0, expense: 0, purchase: (a.purchase || 0) + subPurchase };
  });

  for (const l of store.ledger) {
    if (!l.apartmentId) continue;
    const r = rows.find(x => x.id === l.apartmentId);
    if (!r) continue;
    if (l.type === 'RENT') r.income += l.amount;
    if (l.type === 'EXPENSE') r.expense += l.amount;
  }
  return rows;
}

function computeCoverage(store: Store) {
  const map = new Map<
    string,
    { key: string; apartmentId?: string; tenantId?: string; apartmentName?: string; tenantName?: string; to?: string }
  >();

  const aptById = Object.fromEntries(store.apartments.map(a => [a.id, a.name]));
  const tenById = Object.fromEntries(store.tenants.map(t => [t.id, t.name]));

  for (const l of store.ledger) {
    if (l.type !== 'RENT' || !l.to) continue;
    const key = `${l.apartmentId || ''}__${l.tenantId || ''}`;
    const cur = map.get(key);
    if (!cur || (cur.to || '') < l.to) {
      map.set(key, {
        key,
        apartmentId: l.apartmentId,
        tenantId: l.tenantId,
        apartmentName: l.apartmentId ? aptById[l.apartmentId] : undefined,
        tenantName: l.tenantId ? tenById[l.tenantId] : undefined,
        to: l.to,
      });
    }
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const today = new Date(todayISO + 'T00:00:00Z');

  return [...map.values()].map(r => {
    const daysLeft =
      r.to != null
        ? Math.ceil((new Date(r.to + 'T00:00:00Z').getTime() - today.getTime()) / 86400000)
        : Number.MIN_SAFE_INTEGER;
    return { ...r, daysLeft };
  });
}

function fmtLong(iso: string) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}
