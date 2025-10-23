import './globals.css';
import Gate from '@/components/Gate';
import { cookies } from 'next/headers';
import Link from 'next/link';

export const metadata = { title: 'Rental Pro' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const hasCookie = cookies().get('access')?.value === 'ok';
  return (
    <html lang="en"><body>
      <div className="container">
        <div className="hdr">
          <div className="h1">🏠 Rental Pro <span className="badge">Private</span></div>
          <div style={{display:'flex',gap:8}}>
            <Link className="btn" href="/">Dashboard</Link>
            <Link className="btn" href="/add">Adding</Link>
            <Link className="btn" href="/properties">Properties</Link>
            <Link className="btn" href="/tenants">Tenants</Link>
          </div>
        </div>
        {children}
      </div>
      <Gate hasCookie={hasCookie}/>
    </body></html>
  );
}
