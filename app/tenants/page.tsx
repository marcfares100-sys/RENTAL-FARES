import { kvGet } from '@/lib/kv';
import type { Store } from '../api/store/route';

export default async function Tenants() {
  const store = (await kvGet<Store>('rental:store:v1')) ?? {currency:'USD',apartments:[],tenants:[],ledger:[]};
  return (
    <main className="card">
      <div className="h2">Tenants</div>
      {store.tenants.length===0 ? <p>No tenants yet. Use the Adding page.</p> :
      <table className="table"><thead>
        <tr><th>Name</th><th>ID</th></tr>
      </thead><tbody>
        {store.tenants.map(t=><tr key={t.id}><td>{t.name}</td><td className="mono">{t.id}</td></tr>)}
      </tbody></table>}
    </main>
  );
}
