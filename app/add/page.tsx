// app/add/page.tsx
'use client';
import { useEffect, useMemo, useState } from 'react';

type EntryType = 'RENT'|'DEPOSIT'|'EXPENSE'|'REFUND';

type SubUnit = { id: string; name: string; purchase?: number };
type Apartment = { id: string; name: string; purchase: number; sub?: SubUnit[] };

type Store = {
  currency: string;
  apartments: Apartment[];
  tenants: Array<{ id: string; name: string }>;
  ledger: Array<{ id:string; date:string; apartmentId?:string; subId?:string; tenantId?:string; type:EntryType; amount:number; from?:string; to?:string; note?:string }>;
};

const uid = () => Math.random().toString(36).slice(2,10);
const todayISO = () => new Date().toISOString().slice(0,10);

export default function AddPage(){
  const [store,setStore] = useState<Store>({currency:'USD',apartments:[],tenants:[],ledger:[]});
  const [loading,setLoading] = useState(true);

  useEffect(()=>{ (async()=>{
    const r = await fetch('/api/store'); setStore(await r.json()); setLoading(false);
  })()},[]);

  async function save(action:string, data:any){
    const r = await fetch('/api/store',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,data})});
    if(!r.ok) { alert('Save failed'); return; }
    const s = await fetch('/api/store'); setStore(await s.json());
    alert('Saved ✔');
  }

  // ---- forms ----
  // add property
  const [aptName,setAptName] = useState(''); const [purchase,setPurchase] = useState<number>(0);

  // add sub-property
  const [parentId,setParentId] = useState(''); const [subName,setSubName] = useState(''); const [subPurchase,setSubPurchase] = useState<number>(0);

  // add tenant
  const [tenantName,setTenantName] = useState('');

  // add entry
  const [type,setType] = useState<EntryType>('RENT');
  const [apartmentId,setApartmentId] = useState(''); const [subId,setSubId] = useState('');
  const [tenantId,setTenantId] = useState('');
  const [date,setDate]=useState(todayISO()); const [from,setFrom] = useState(todayISO()); const [to,setTo] = useState(todayISO());
  const [amount,setAmount] = useState<number>(0); const [note,setNote] = useState('');

  const apartments = store.apartments;
  const tenants = store.tenants;

  const selectedApt = useMemo(
    () => apartments.find(a => a.id === apartmentId),
    [apartments, apartmentId]
  );

  useEffect(()=>{ setSubId(''); },[apartmentId]);

  if(loading) return <main className="card">Loading…</main>;

  return <main className="row">
    {/* Add Property */}
    <section className="card">
      <div className="h2">Add Property</div>
      <label>Name</label><input className="input" value={aptName} onChange={e=>setAptName(e.target.value)} placeholder="e.g., LA DIVA" />
      <label>Purchase Price</label><input className="input" type="number" step="0.01" value={purchase} onChange={e=>setPurchase(Number(e.target.value||0))} />
      <button className="btn" onClick={()=>save('addApartment',{id:uid(),name:aptName.trim(),purchase})}>Save Property</button>
    </section>

    {/* Add Sub-property */}
    <section className="card">
      <div className="h2">Add Sub-property</div>
      <label>Parent Property</label>
      <select className="input" value={parentId} onChange={e=>setParentId(e.target.value)}>
        <option value="">(choose property)</option>
        {apartments.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <label>Sub-property Name</label>
      <input className="input" value={subName} onChange={e=>setSubName(e.target.value)} placeholder="e.g., 2ND FLOOR, Apt 3B" />
      <label>Purchase Price (optional)</label>
      <input className="input" type="number" step="0.01" value={subPurchase} onChange={e=>setSubPurchase(Number(e.target.value||0))} />
      <button
        className="btn"
        disabled={!parentId || !subName.trim()}
        onClick={()=>save('addSub',{ apartmentId: parentId, sub: { id: uid(), name: subName.trim(), purchase: subPurchase || 0 } })}
      >
        Save Sub-property
      </button>
    </section>

    {/* Add Tenant */}
    <section className="card">
      <div className="h2">Add Tenant</div>
      <label>Name</label><input className="input" value={tenantName} onChange={e=>setTenantName(e.target.value)} placeholder="Tenant full name" />
      <button className="btn" onClick={()=>save('addTenant',{id:uid(),name:tenantName.trim()})}>Save Tenant</button>
    </section>

    {/* Add Entry */}
    <section className="card">
      <div className="h2">Add Entry</div>
      <label>Type</label>
      <select className="input" value={type} onChange={e=>setType(e.target.value as EntryType)}>
        <option value="RENT">RENT</option>
        <option value="DEPOSIT">DEPOSIT</option>
        <option value="EXPENSE">EXPENSE</option>
        <option value="REFUND">REFUND</option>
      </select>

      <label>Property</label>
      <select className="input" value={apartmentId} onChange={e=>setApartmentId(e.target.value)}>
        <option value="">(none)</option>
        {apartments.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      {selectedApt?.sub?.length ? (
        <>
          <label>Sub-property</label>
          <select className="input" value={subId} onChange={e=>setSubId(e.target.value)}>
            <option value="">(none)</option>
            {selectedApt.sub.map(s=>(
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </>
      ) : null}

      <label>Tenant</label>
      <select className="input" value={tenantId} onChange={e=>setTenantId(e.target.value)}>
        <option value="">(none)</option>
        {tenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      <label>Date</label><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <label>From</label><input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
        </div>
        <div>
          <label>To</label><input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
      </div>
      <label>Amount</label><input className="input" type="number" step="0.01" value={amount} onChange={e=>setAmount(Number(e.target.value||0))} />
      <label>Note</label><input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional" />

      <button
        className="btn"
        onClick={()=>save('addLedger',{
          id:uid(), type, amount,
          apartmentId: apartmentId || undefined,
          subId: subId || undefined,            // <-- NEW
          tenantId: tenantId || undefined,
          from: from || undefined,
          to: to || undefined,
          date: date || todayISO(),
          note: note || undefined
        })}
      >
        Save Entry
      </button>
    </section>
  </main>;
}
