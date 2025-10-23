// app/log/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Store } from '@/app/api/store/route';
import { Money } from '@/components/UI';

type EntryType = 'RENT'|'DEPOSIT'|'EXPENSE'|'REFUND';

const toISO = (d?: string) => {
  if (!d) return '';
  // Accept YYYY-MM-DD or D/M/Y; normalize to YYYY-MM-DD
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return d;
  const parts = d.replaceAll('.', '/').replaceAll('-', '/').split('/');
  if (parts.length === 3) {
    const [dd, mm, yyyy] = parts.map(p => p.trim());
    if (yyyy?.length === 4) {
      const D = String(dd).padStart(2, '0');
      const M = String(mm).padStart(2, '0');
      return `${yyyy}-${M}-${D}`;
    }
  }
  // fallback: keep as-is
  return d;
};

const fmtDMY = (iso?: string) => {
  if (!iso) return '—';
  // from YYYY-MM-DD → DD/MM/YYYY
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

export default function LogPage() {
  const [store, setStore] = useState<Store>({ currency: 'USD', apartments: [], tenants: [], ledger: [] });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const currency = store.currency || 'USD';
  const aptMap = useMemo(() => Object.fromEntries(store.apartments.map(a => [a.id, a.name])), [store.apartments]);
  const tenMap = useMemo(() => Object.fromEntries(store.tenants.map(t => [t.id, t.name])), [store.tenants]);

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/store', { cache: 'no-store' });
      setStore(await r.json());
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(
    () => [...store.ledger].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    [store.ledger]
  );

  const beginEdit = (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    setEditingId(id);
    setForm({
      ...row,
      date: row.date ?? '',
      from: row.from ?? '',
      to: row.to ?? '',
      amount: row.amount ?? 0
    });
  };

  const cancel = () => {
    setEditingId(null);
    setForm({});
  };

  const save = async () => {
    if (!editingId) return;
    setSaving(true);
    const payload = {
      ...form,
      id: editingId,
      date: toISO(form.date),
      from: toISO(form.from),
      to: toISO(form.to),
      amount: Number(form.amount || 0),
    };
    const r = await fetch('/api/store', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'updateLedger', data: payload }),
    });
    setSaving(false);
    if (!r.ok) {
      alert('Save failed');
      return;
    }
    // refresh
    const s = await fetch('/api/store', { cache: 'no-store' });
    setStore(await s.json());
    cancel();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    const r = await fetch('/api/store', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'deleteLedger', id }),
    });
    if (!r.ok) {
      alert('Delete failed');
      return;
    }
    const s = await fetch('/api/store', { cache: 'no-store' });
    setStore(await s.json());
    if (editingId === id) cancel();
  };

  if (loading) return <main className="card">Loading…</main>;

  return (
    <main className="card">
      <div className="h2" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>Payments & Entries</span>
        <span className="mono" style={{opacity:.7}}>Total: {rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <p>No entries yet.</p>
      ) : (
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
              <th className="mono">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l => {
              const isEdit = editingId === l.id;
              return (
                <tr key={l.id}>
                  <td data-label="Date">
                    {isEdit ? (
                      <input
                        className="input"
                        type="date"
                        value={form.date || ''}
                        onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))}
                      />
                    ) : fmtDMY(l.date)}
                  </td>

                  <td data-label="Type" className="mono">
                    {isEdit ? (
                      <select
                        className="input"
                        value={form.type}
                        onChange={e => setForm((f: any) => ({ ...f, type: e.target.value as EntryType }))}
                      >
                        <option value="RENT">RENT</option>
                        <option value="DEPOSIT">DEPOSIT</option>
                        <option value="EXPENSE">EXPENSE</option>
                        <option value="REFUND">REFUND</option>
                      </select>
                    ) : l.type}
                  </td>

                  <td data-label="Apartment">
                    {isEdit ? (
                      <select
                        className="input"
                        value={form.apartmentId || ''}
                        onChange={e => setForm((f: any) => ({ ...f, apartmentId: e.target.value || undefined }))}
                      >
                        <option value="">(none)</option>
                        {store.apartments.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    ) : (aptMap[l.apartmentId || ''] || '—')}
                  </td>

                  <td data-label="Tenant">
                    {isEdit ? (
                      <select
                        className="input"
                        value={form.tenantId || ''}
                        onChange={e => setForm((f: any) => ({ ...f, tenantId: e.target.value || undefined }))}
                      >
                        <option value="">(none)</option>
                        {store.tenants.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (tenMap[l.tenantId || ''] || '—')}
                  </td>

                  <td data-label="From → To">
                    {isEdit ? (
                      <div style={{display:'flex',gap:8}}>
                        <input
                          className="input"
                          type="date"
                          value={form.from || ''}
                          onChange={e => setForm((f: any) => ({ ...f, from: e.target.value }))}
                          aria-label="from"
                        />
                        <span className="mono" style={{alignSelf:'center'}}>→</span>
                        <input
                          className="input"
                          type="date"
                          value={form.to || ''}
                          onChange={e => setForm((f: any) => ({ ...f, to: e.target.value }))}
                          aria-label="to"
                        />
                      </div>
                    ) : (
                      <>
                        {fmtDMY(l.from)} → {fmtDMY(l.to)}
                      </>
                    )}
                  </td>

                  <td data-label="Amount">
                    {isEdit ? (
                      <input
                        className="input"
                        type="number"
                        value={form.amount ?? 0}
                        onChange={e => setForm((f: any) => ({ ...f, amount: e.target.value }))}
                      />
                    ) : <Money n={l.amount || 0} currency={currency} />}
                  </td>

                  <td data-label="Note">
                    {isEdit ? (
                      <input
                        className="input"
                        value={form.note || ''}
                        onChange={e => setForm((f: any) => ({ ...f, note: e.target.value }))}
                      />
                    ) : (l.note || '—')}
                  </td>

                  <td className="mono" data-label="Actions" style={{whiteSpace:'nowrap'}}>
                    {isEdit ? (
                      <>
                        <button className="btn" onClick={save} disabled={saving}>Save</button>{' '}
                        <button className="btn" onClick={cancel}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn" onClick={() => beginEdit(l.id)}>Edit</button>{' '}
                        <button className="btn" onClick={() => remove(l.id)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
