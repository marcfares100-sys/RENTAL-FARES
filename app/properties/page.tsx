// app/properties/page.tsx
'use client';

import { useEffect, useState } from 'react';
import type { Store } from '../api/store/route';

type AptForm = { id: string; name: string; purchase: number };
type SubForm = { id: string; name: string; purchase?: number };

export default function PropertiesPage() {
  const [store, setStore] = useState<Store>({ currency:'USD', apartments:[], tenants:[], ledger:[] });
  const [loading, setLoading] = useState(true);

  // edit state
  const [editingApt, setEditingApt] = useState<AptForm | null>(null);
  const [editingSub, setEditingSub] = useState<{ apartmentId: string; sub: SubForm } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    const r = await fetch('/api/store', { cache:'no-store' });
    setStore(await r.json());
    setLoading(false);
  })(); }, []);

  async function refresh() {
    const r = await fetch('/api/store', { cache:'no-store' });
    setStore(await r.json());
  }

  async function call(action: string, data: any) {
    setSaving(true);
    const r = await fetch('/api/store', {
      method:'POST',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify({ action, ...data })
    });
    setSaving(false);
    if (!r.ok) alert('Operation failed');
    await refresh();
    setEditingApt(null);
    setEditingSub(null);
  }

  // Apartment actions
  const onEditApt = (id: string) => {
    const a = store.apartments.find(x => x.id === id)!;
    setEditingApt({ id: a.id, name: a.name, purchase: a.purchase || 0 });
    setEditingSub(null);
  };
  const onSaveApt = () => call('updateApartment', { data: editingApt });
  const onDeleteApt = (id: string) => {
    if (confirm('Delete this property and all its entries?')) call('deleteApartment', { id });
  };

  // Sub actions
  const onEditSub = (apartmentId: string, subId: string) => {
    const apt = store.apartments.find(a => a.id === apartmentId)!;
    const s = (apt.sub ?? []).find(x => x.id === subId)!;
    setEditingApt(null);
    setEditingSub({ apartmentId, sub: { id: s.id, name: s.name, purchase: s.purchase || 0 } });
  };
  const onSaveSub = () => call('updateSub', { data: editingSub });
  const onDeleteSub = (apartmentId: string, subId: string) => {
    if (confirm('Delete this sub-property and its entries?')) call('deleteSub', { apartmentId, subId });
  };

  if (loading) return <main className="card">Loading…</main>;

  return (
    <main className="card">
      <div className="h2">Properties</div>

      {store.apartments.length === 0 ? (
        <p>No properties yet. Use the Adding page to create some.</p>
      ) : (
        <table className="rtable">
          <thead>
            <tr><th>Name</th><th>Purchase</th><th className="mono">Actions</th></tr>
          </thead>
          <tbody>
            {store.apartments.map(a => {
              const isEdit = editingApt?.id === a.id;
              return (
                <>
                  <tr key={a.id}>
                    <td>
                      {isEdit ? (
                        <input
                          className="input"
                          value={editingApt!.name}
                          onChange={e => setEditingApt(v => v ? { ...v, name: e.target.value } : v)}
                        />
                      ) : a.name}
                    </td>
                    <td className="mono">
                      {isEdit ? (
                        <input
                          className="input"
                          type="number"
                          value={editingApt!.purchase}
                          onChange={e => setEditingApt(v => v ? { ...v, purchase: Number(e.target.value || 0) } : v)}
                        />
                      ) : (a.purchase || 0)}
                    </td>
                    <td className="mono" style={{whiteSpace:'nowrap'}}>
                      {isEdit ? (
                        <>
                          <button className="btn" onClick={onSaveApt} disabled={saving}>Save</button>{' '}
                          <button className="btn" onClick={() => setEditingApt(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn" onClick={() => onEditApt(a.id)}>Edit</button>{' '}
                          <button className="btn" onClick={() => onDeleteApt(a.id)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>

                  {(a.sub ?? []).map(s => {
                    const sEdit = editingSub && editingSub.apartmentId === a.id && editingSub.sub.id === s.id;
                    return (
                      <tr key={`${a.id}/${s.id}`}>
                        <td style={{paddingLeft:24}}>
                          ↳ {sEdit ? (
                            <input
                              className="input"
                              value={editingSub!.sub.name}
                              onChange={e => setEditingSub(v => v ? ({ ...v, sub: { ...v.sub, name: e.target.value } }) : v)}
                            />
                          ) : s.name}
                        </td>
                        <td className="mono">
                          {sEdit ? (
                            <input
                              className="input"
                              type="number"
                              value={editingSub!.sub.purchase ?? 0}
                              onChange={e => setEditingSub(v => v ? ({ ...v, sub: { ...v.sub, purchase: Number(e.target.value || 0) } }) : v)}
                            />
                          ) : (s.purchase || 0)}
                        </td>
                        <td className="mono" style={{whiteSpace:'nowrap'}}>
                          {sEdit ? (
                            <>
                              <button className="btn" onClick={onSaveSub} disabled={saving}>Save</button>{' '}
                              <button className="btn" onClick={() => setEditingSub(null)}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="btn" onClick={() => onEditSub(a.id, s.id)}>Edit</button>{' '}
                              <button className="btn" onClick={() => onDeleteSub(a.id, s.id)}>Delete</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
