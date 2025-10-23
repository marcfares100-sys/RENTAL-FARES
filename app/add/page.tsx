'use client';
import { useEffect, useState } from 'react';

type EntryType = 'RENT'|'DEPOSIT'|'EXPENSE'|'REFUND';
type Store = {
  currency: string;
  apartments: Array<{ id: string; name: string; purchase: number }>;
  tenants: Array<{ id: string; name: string }>;
  ledger: Array<{ id:string; date:string; apartmentId?:string; tenantId?:string; type:EntryType; amount:number; from?:string; to?:string; note?:string }>;
};

const uid = () => Math.random().toString(36).slice(2,10);

export default function AddPage(){
  const [store,setStore] = useState<Store>({currency:'USD',apartments:[],tenants:[],ledger:[]});
  const [loading,setLoading] = useState(true);

  useEffect(()=>{ (async()=>{
    const r = await fetch('/api/store'); setStore(await r.json()); setLoading(false);
  })()},[]);

  async function save(action:string, data:any){
    const r = await fetch('/api/store',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,data})});
    if(!r.ok) alert('Save failed'); else {
      const s = await fetch('/api/store'); setStore(await s.json());
    }
  }

  const [aptName,setAptName] = useState(''); const [purchase,setPurchase] = useState<number>(0);
  const [tenant,setTenant] = useState(''); const [tenantName,setTenantName] = useState('');
  const [apt,setApt] = useState(''); const [type,setType] = useState<EntryType>('RENT');
  const [amount,setAmount] = useState<number>(0); const [from,setFrom] = useState(''); const [to,setTo] = useState(''); const [date,setDate]=useState('');

  const tenants = store.tenants;
  const apartments = store.apartments;

  if(loading) return <main className="card">Loading…</main>;

  return <main className="row">
    <section className="card" style={{flex:'1 1 360px'}}>
      <div className="h2">Add Apartment</div>
      <label>Name</label><input className="input" value={aptName} onChange={e=>setAptName(e.target.value)} />
      <label>Purchase Price</label><input className="input" type="number" value={purchase} onChange={e=>setPurchase(Number(e.target.value||0))} />
      <button className="btn" onClick={()=>save('addApartment',{id:uid(),name:aptName,purchase})}>Save Apartment</button>
    </section>

    <section className="card" style={{flex:'1 1 360px'}}>
      <div className="h2">Add Tenant</div>
      <label>Name</label><input className="input" value={tenantName} onChange={e=>setTenantName(e.target.value)} />
      <button className="btn" onClick={()=>save('addTenant',{id:uid(),name:tenantName})}>Save Tenant</button>
    </section>

    <section className="card" style={{flex:'1 1 360px'}}>
      <div className="h2">Add Entry</div>
      <label>Type</label>
      <select className="input" value={type} onChange={e=>setType(e.target.value as EntryType)}>
        <option value="RENT">RENT</option>
        <option value="DEPOSIT">DEPOSIT</option>
        <option value="EXPENSE">EXPENSE</option>
        <option value="REFUND">REFUND</option>
      </select>
      <label>Apartment</label>
      <select className="input" value={apt} onChange={e=>setApt(e.target.value)}>
        <option value="">(none)</option>
        {apartments.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <label>Tenant</label>
      <select className="input" value={tenant} onChange={e=>setTenant(e.target.value)}>
        <option value="">(none)</option>
        {tenants.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <label>Date</label><input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
      <label>From</label><input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
      <label>To</label><input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)} />
      <label>Amount</label><input className="input" type="number" value={amount} onChange={e=>setAmount(Number(e.target.value||0))} />
      <button className="btn" onClick={()=>save('addLedger',{id:uid(),type,amount,apartmentId:apt||undefined,tenantId:tenant||undefined,from:from||undefined,to:to||undefined,date:date||new Date().toISOString().slice(0,10)})}>
        Save Entry
      </button>
    </section>
  </main>;
}
