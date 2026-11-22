import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSession,
  getClientIp,
  isSecureRequest,
  getUserByUsername,
  loginAllowed,
  recordLoginFailure,
  resetLoginFailures,
  verifyPassword,
} from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!loginAllowed(ip)) {
      return NextResponse.json({ error: '尝试次数过多，请 5 分钟后再试' }, { status: 429 });
    }
    const body = (await req.json()) as { username?: unknown; password?: unknown };
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
    }

    const row = getUserByUsername(username);
    if (!row || !verifyPassword(password, row.password_hash)) {
      recordLoginFailure(ip);
      return NextResponse.json({ error: '用户名或密码不正确' }, { status: 401 });
    }

    resetLoginFailures(ip);
    const token = createSession(row.id);
    const res = NextResponse.json({ ok: true, user: { id: row.id, username: row.username } });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
      sameSite: 'lax',
      secure: isSecureRequest(req),
    });
    return res;
  } catch {
    return NextResponse.json({ error: '登录失败，请稍后再试' }, { status: 500 });
  }
}
