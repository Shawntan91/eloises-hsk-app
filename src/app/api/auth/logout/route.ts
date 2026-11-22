import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, deleteSession, isSecureRequest } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0, sameSite: 'lax', secure: isSecureRequest(req) });
  return res;
}
