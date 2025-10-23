import { kvGet } from '@/lib/kv';
import type { Store } from './api/store/route';
import { Money, Section } from '@/components/UI';
import Link from 'next/link';

export default async function Page() {
  const store = (await kvGet<Store>('rental:store:v1')) ?? {currency:'USD',apartments:[],tenants:[],ledger:[]};
  const currency = store.currency ?? 'USD';
  const { rent, dep, exp, net, byApt } = summarize(store);

  return (
    <main className="row">
      <Section title="Totals">
        <div style={{display:'grid',gap:8}}>
          <div>Total Rent<br/><Money n={rent} currency={currency}/></div>
          <div>Expenses<br/><Money n={exp} currency={currency}/></div>
          <div>Deposits<br/><Money n={dep} currency={currency}/></div>
          <div>Net<br/><Money n={net} currency={currency}/></div>
          <div style={{marginTop:12}}><Link className="btn" href="/add">Add entries</Link></div>
        </div>
      </Section>

      <Section title="ROI by Property">
        {byApt.size===0 ? <p>No properties yet. Add from <Link href="/properties">Properties</Link> or <Link href="/add">Adding</Link>.</p> :
          <table className="table"><thead>
            <tr><th>Property</th><th>Income (12m)</th><th>Expenses (12m)</th><th>Net</th><th>Purchase</th><th>ROI</th></tr>
          </thead><tbody>
            {[...byApt.entries()].map(([id,row])=>{
              const net = row.income - row.expense;
              const roi = row.purchase ? (net / row.purchase) : 0;
              return <tr key={id}>
                <td>{row.name}</td>
                <td><Money n={row.income} currency={currency}/></td>
                <td><Money n={row.expense} currency={currency}/></td>
                <td><Money n={net} currency={currency}/></td>
                <td><Money n={row.purchase} currency={currency}/></td>
                <td>{(roi*100).toFixed(1)}%</td>
              </tr>;
            })}
          </tbody></table>}
      </Section>

      <Section title="Due & Late">
        <p>No rent coverage entries yet.</p>
      </Section>
    </main>
  );
}

function summarize(store: Store){
  const sum = (f:(x:any)=>number)=>store.ledger.reduce((a,b)=>a+f(b),0);
  const rent = sum(l=>l.type==='RENT'?l.amount:0);
  const dep  = sum(l=>l.type==='DEPOSIT'?l.amount:0);
  const exp  = sum(l=>l.type==='EXPENSE'?l.amount:0);
  const net  = rent-exp;
  const byApt = new Map<string,{name:string; income:number; expense:number; purchase:number}>();
  for(const a of store.apartments) byApt.set(a.id,{name:a.name,income:0,expense:0,purchase:a.purchase||0});
  for(const l of store.ledger){
    if(!l.apartmentId) continue;
    const r = byApt.get(l.apartmentId); if(!r) continue;
    if(l.type==='RENT') r.income += l.amount;
    if(l.type==='EXPENSE') r.expense += l.amount;
  }
  return {rent,dep,exp,net,byApt};
}
