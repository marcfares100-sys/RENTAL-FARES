import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { code } = await req.json();
  if (!process.env.ADMIN_WRITE_KEY) {
    return NextResponse.json({ error: 'Server missing ADMIN_WRITE_KEY' }, { status: 500 });
  }
  if (code !== process.env.ADMIN_WRITE_KEY) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('access', 'ok', { httpOnly: true, maxAge: 60 * 60 * 24 * 90, path: '/' });
  return res;
}
