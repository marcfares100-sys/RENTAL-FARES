// app/layout.tsx
import './globals.css';
import Gate from '@/components/Gate';
import Link from 'next/link';
import { cookies } from 'next/headers';

export const metadata = { title: 'Rental Pro' };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Next.js 15: cookies() is async
  const cookieStore = await cookies();
  const hasCookie = cookieStore.get('access')?.value === 'ok';

  return (
    <html lang="en">
      <body>
        <div className="container">
          <div className="hdr">
            <div className="h1">
              🏠 Rental Pro <span className="badge">Private</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link className="btn" href="/">Dashboard</Link>
              <Link className="btn" href="/add">Adding</Link>
              <Link className="btn" href="/properties">Properties</Link>
              <Link className="btn" href="/tenants">Tenants</Link>
              <Link className="btn" href="/log">Log</Link>
            </div>
          </div>

          {children}
        </div>

        {/* Auth Gate overlays the app if access cookie is missing */}
        <Gate hasCookie={hasCookie} />
      </body>
    </html>
  );
}
