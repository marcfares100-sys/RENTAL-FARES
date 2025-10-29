'use client';

import { useEffect, useMemo, useState } from 'react';

type EntryType = 'RENT'|'DEPOSIT'|'EXPENSE'|'REFUND';
type Apt = { id:string; name:string; purchase:number; sub?:Array<{id:string; name:string; purchase?:number}> };
type Tenant = { id:string; name:string };
type Store = { currency:string; apartments:Apt[]; tenants:Tenant[] };

const uid = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().slice(0,10);

export default function QuickAdd(){
  const [store,setStore] = useState<Store>({currency:'USD',apartments:[],tenants:[]});
  const [loading,setLoading] = useState(true);

  // form
  const [type,setType] = useState<EntryType>('RENT');
  const [aptId,setAptId] = useState('');
  const [subId,setSubId] = useState('');
  const [tenantId,setTenantId] = useState('');
  const [date,setDate] = useState(today());
  const [from,setFrom] = useState(today());
  const [to,setTo] = useState(today());
  const [amount,setAmount] = useState<number>(0);
  const [note,setNote] = useState('');

  useEffect(()=>{ (async()=>{
    const r = await fetch('/api/store', { cache:'no-store' });
    const j = await r.json();
    setStore({ currency:j.currency, apartments:j.apartments, tenants:j.tenants });
    setLoading(false);
  })(); },[]);

  const selectedApt = useMemo(()=> store.apartments.find(a=>a.id===aptId),[store.apartments,aptId]);
  useEffect(()=>{ setSubId(''); },[aptId]); // reset sub when apt changes

  async function save(){
    const body = {
      action:'addLedger',
      data:{
        id:uid(), type, amount:Number(amount||0),
        apartmentId: aptId || undefined,
        subId: subId || undefined,
        tenantId: tenantId || undefined,
        date, from: from || undefined, to: to || undefined,
        note: note || undefined
      }
    };
    const r = await fetch('/api/store',{ method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });
    if(!r.ok){ alert('Save failed'); return; }
    // small reset for speed
    setType('RENT'); setTenantId(''); setAmount(0); setNote('');
    alert('Entry saved ✔');
  }

  if(loading) return <div className="card">Loading…</div>;

  return (
    <section className="card" style={{flex:'1 1 420px', minWidth:320}}>
      <div className="h2">Quick Add</div>
      <div className="form-grid">
        <div>
          <label>Type</label>
          <select className="input" value={type} onChange={e=>setType(e.target.value as EntryType)}>
            <option value="RENT">RENT</option>
            <option value="DEPOSIT">DEPOSIT</option>
            <option value="EXPENSE">EXPENSE</option>
            <option value="REFUND">REFUND</option>
          </select>
        </div>

        <div>
          <label>Property</label>
          <select className="input" value={aptId} onChange={e=>setAptId(e.target.value)}>
            <option value="">(none)</option>
            {store.apartments.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {selectedApt?.sub?.length ? (
          <div>
            <label>Sub-property</label>
            <select className="input" value={subId} onChange={e=>setSubId(e.target.value)}>
              <option value="">(none)</option>
              {selectedApt.sub.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        ) : null}

        <div>
          <label>Tenant</label>
          <select className="input" value={tenantId} onChange={e=>setTenantId(e.target.value)}>
            <option value="">(none)</option>
            {store.tenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div>
          <label>Date</label>
          <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </div>

        <div className="form-2 form-grid">
          <div>
            <label>From</label>
            <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div>
            <label>To</label>
            <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
        </div>

        <div>
          <label>Amount</label>
          <input className="input" type="number" step="0.01" value={amount} onChange={e=>setAmount(Number(e.target.value||0))}/>
        </div>

        <div>
          <label>Note</label>
          <input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional"/>
        </div>

        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-primary" onClick={save}>Save Entry</button>
          <a className="btn" href="/add">Open full form</a>
        </div>
      </div>
    </section>
  );
}
