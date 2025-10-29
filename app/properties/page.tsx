// app/properties/page.tsx
import { kvGet } from '@/lib/kv';
import type { Store } from '../api/store/route';

export default async function Properties() {
  const store = (await kvGet<Store>('rental:store:v1')) ?? { currency:'USD', apartments:[], tenants:[], ledger:[] };
  return (
    <main className="card">
      <div className="h2">Properties</div>
      {store.apartments.length===0 ? <p>No properties yet. Use the Adding page.</p> :
      <table className="rtable"><thead>
        <tr><th>Name</th><th>Purchase</th></tr>
      </thead><tbody>
        {store.apartments.map(a=>(
          <tr key={a.id}><td>{a.name}</td><td className="mono">{a.purchase || 0}</td></tr>
        ))}
        {store.apartments.flatMap(a =>
          (a.sub ?? []).map(s => (
            <tr key={`${a.id}/${s.id}`}>
              <td style={{paddingLeft:24}}>↳ {s.name}</td>
              <td className="mono">{s.purchase || 0}</td>
            </tr>
          ))
        )}
      </tbody></table>}
    </main>
  );
}
