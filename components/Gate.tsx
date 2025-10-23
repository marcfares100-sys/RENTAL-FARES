'use client';
import { useState } from 'react';

export default function Gate({ hasCookie }: { hasCookie: boolean }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string|undefined>();
  if (hasCookie) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);
    const r = await fetch('/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});
    if (r.ok) location.reload();
    else setErr((await r.json()).error ?? 'Failed');
  };
  return (
    <div style={{position:'fixed',inset:0,display:'grid',placeItems:'center',background:'rgba(0,0,0,.4)',backdropFilter:'blur(4px)',zIndex:50}}>
      <form onSubmit={submit} className="card" style={{width:420}}>
        <div className="h2">Enter Access Code</div>
        <p className="mono" style={{opacity:.7}}>Use the key you set in Vercel.</p>
        <label>Code</label>
        <input className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="fares"/>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          <button className="btn" type="submit">Continue</button>
          {err && <span className="danger mono">{err}</span>}
        </div>
      </form>
    </div>
  );
}
