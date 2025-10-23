import { kvGet } from '@/lib/kv';
import type { Store } from '../api/store/route';
import { formatDMY } from '@/lib/date';
import { Money } from '@/components/UI';

export const metadata = { title: 'Payments Log' };

export default async function LogPage() {
  const store =
    (await kvGet<Store>('rental:store:v1')) ??
    { currency: 'USD', apartments: [], tenants: [], ledger: [] };

  const aptMap = Object.fromEntries(store.apartments.map(a => [a.id, a.name]));
  const tenMap = Object.fromEntries(store.tenants.map(t => [t.id, t.name]));
  const rows = [...store.ledger].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <main className="card">
      <div className="h2">Payments & Entries</div>
      {rows.length === 0 ? <p>No entries yet.</p> : (
        <table className="rtable">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Apartment</th>
              <th>Tenant</th>
              <th>From → To</th>
              <th>Amount</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.id}>
                <td data-label="Date">{formatDMY(l.date)}</td>
                <td data-label="Type" className="mono">{l.type}</td>
                <td data-label="Apartment">{aptMap[l.apartmentId || ''] || '—'}</td>
                <td data-label="Tenant">{tenMap[l.tenantId || ''] || '—'}</td>
                <td data-label="From → To">
                  {l.from ? formatDMY(l.from) : '—'} → {l.to ? formatDMY(l.to) : '—'}
                </td>
                <td data-label="Amount"><Money n={l.amount || 0} currency={store.currency} /></td>
                <td data-label="Note">{l.note || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
