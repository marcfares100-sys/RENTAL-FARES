export function Money({ n, currency='USD' }: { n: number; currency?: string }) {
  return <span className="mono">{new Intl.NumberFormat(undefined,{style:'currency',currency}).format(n)}</span>;
}
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card" style={{flex:'1 1 420px', minWidth:320}}>
    <div className="hdr"><div className="h2">{title}</div></div>{children}
  </section>;
}
