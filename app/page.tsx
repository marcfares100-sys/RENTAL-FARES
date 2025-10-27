// app/page.tsx (Dashboard)
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
  const { rent, dep, exp, net, byApt } = summarize(store);
  const coverage = computeCoverage(store); // ← New

  return (
    <main className="row">
      {/* Totals */}
      <Section title="Totals">
        <div style={{ display: 'grid', gap: 8 }}>
          <div>
            Total Rent
            <br />
            <Money n={rent} currency={currency} />
          </div>
          <div>
            Expenses
            <br />
            <Money n={exp} currency={currency} />
          </div>
          <div>
            Deposits
            <br />
            <Money n={dep} currency={currency} />
          </div>
          <div>
            Net
            <br />
            <Money n={net} currency={currency} />
          </div>
          <div style={{ marginTop: 12 }}>
            <a className="btn" href="/add">
              Add entries
            </a>
          </div>
        </div>
      </Section>

      {/* ROI */}
      <Section title="ROI by Property">
        {byApt.size === 0 ? (
          <p>
            No properties yet. Add from <a href="/properties">Properties</a> or{' '}
            <a href="/add">Adding</a>.
          </p>
        ) : (
          <table className="rtable">
            <thead>
              <tr>
                <th>Property</th>
                <th>Income (12m)</th>
                <th>Expenses (12m)</th>
                <th>Net</th>
                <th>Purchase</th>
                <th>Paid Until</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {[...byApt.entries()].map(([id, row]) => {
                const netVal = row.income - row.expense;
                const roi = row.purchase ? netVal / row.purchase : 0;

                // show the best (latest) coverage date for this apartment
                const best = coverage
                  .filter(c => c.apartmentId === id)
                  .sort((a, b) => (b.to || '').localeCompare(a.to || ''))[0];

                return (
                  <tr key={id}>
                    <td>{row.name}</td>
                    <td>
                      <Money n={row.income} currency={currency} />
                    </td>
                    <td>
                      <Money n={row.expense} currency={currency} />
                    </td>
                    <td>
                      <Money n={netVal} currency={currency} />
                    </td>
                    <td>
                      <Money n={row.purchase} currency={currency} />
                    </td>
                    <td>{best?.to ? fmtLong(best.to) : '—'}</td>
                    <td>{(roi * 100).toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* Due & Late */}
      <Section title="Due & Late">
        {coverage.length === 0 ? (
          <p>No rent coverage entries yet.</p>
        ) : (
          <table className="rtable">
            <thead>
              <tr>
                <th>Apartment</th>
                <th>Tenant</th>
                <th>Paid Until</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {coverage
                .sort((a, b) => a.daysLeft - b.daysLeft) // overdue first
                .map(row => (
                  <tr key={row.key}>
                    <td>{row.apartmentName || '—'}</td>
                    <td>{row.tenantName || '—'}</td>
                    <td>{row.to ? fmtLong(row.to) : '—'}</td>
                    <td>
                      {row.to ? (
                        row.daysLeft >= 0 ? (
                          <span className="badge success">
                            OK ({row.daysLeft} {row.daysLeft === 1 ? 'day' : 'days'} left)
                          </span>
                        ) : (
                          <span className="badge danger">
                            OVERDUE ({Math.abs(row.daysLeft)}{' '}
                            {Math.abs(row.daysLeft) === 1 ? 'day' : 'days'})
                          </span>
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

function summarize(store: Store) {
  const sum = (f: (x: any) => number) => store.ledger.reduce((a, b) => a + f(b), 0);
  const rent = sum(l => (l.type === 'RENT' ? l.amount : 0));
  const dep = sum(l => (l.type === 'DEPOSIT' ? l.amount : 0));
  const exp = sum(l => (l.type === 'EXPENSE' ? l.amount : 0));
  const net = rent - exp;

  const byApt = new Map<
    string,
    { name: string; income: number; expense: number; purchase: number }
  >();
  for (const a of store.apartments)
    byApt.set(a.id, { name: a.name, income: 0, expense: 0, purchase: a.purchase || 0 });

  for (const l of store.ledger) {
    if (!l.apartmentId) continue;
    const row = byApt.get(l.apartmentId);
    if (!row) continue;
    if (l.type === 'RENT') row.income += l.amount;
    if (l.type === 'EXPENSE') row.expense += l.amount;
  }
  return { rent, dep, exp, net, byApt };
}

function computeCoverage(store: Store) {
  // choose the latest "to" per (apartmentId, tenantId)
  const map = new Map<
    string,
    {
      key: string;
      apartmentId: string | undefined;
      tenantId: string | undefined;
      apartmentName?: string;
      tenantName?: string;
      to?: string;
    }
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

  // convert to list with daysLeft
  const todayISO = new Date().toISOString().slice(0, 10);
  const today = new Date(todayISO + 'T00:00:00Z');

  const list = [...map.values()].map(r => {
    const daysLeft =
      r.to != null
        ? Math.ceil(
            (new Date(r.to + 'T00:00:00Z').getTime() - today.getTime()) / 86400000
          )
        : Number.MIN_SAFE_INTEGER; // treat as extremely overdue when no 'to'
    return { ...r, daysLeft };
  });

  return list;
}

function fmtLong(iso: string) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}
