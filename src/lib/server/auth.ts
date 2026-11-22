import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { getDb } from './db';

export const SESSION_COOKIE = 'hsk_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 3600; // 30 days
// Whether this request arrived over HTTPS. Behind the nginx reverse proxy,
// nginx sends X-Forwarded-Proto: https; a direct local HTTP request has no
// such header, so the session cookie stays non-Secure on plain HTTP and
// gains Secure on HTTPS.
export function isSecureRequest(req: NextRequest): boolean {
  const forwarded = req.headers.get('x-forwarded-proto');
  if (forwarded) {
    return forwarded.split(',')[0].trim().toLowerCase() === 'https';
  }
  return req.nextUrl.protocol === 'https:';
}


// Registration switch. HSK 站不开放注册：默认关闭，账号由管理员直接在库里建。
// 只有显式设置 ALLOW_REGISTER=true 时才允许注册接口（本站没有注册接口，
// 该开关目前只影响 /api/auth/me 返回的 allowRegister 标志，即登录弹窗是否显示注册入口）。
export function allowRegister(): boolean {
  const v = process.env.ALLOW_REGISTER;
  return v === 'true' || v === '1';
}

export function validateUsername(username: string): string | null {
  if (typeof username !== 'string') return '用户名无效';
  if (username.length < 3 || username.length > 32) return '用户名长度需为 3-32 个字符';
  if (!/^[A-Za-z0-9_\u4e00-\u9fa5]+$/.test(username)) return '用户名只能包含字母、数字、下划线和汉字';
  return null;
}

export function validatePassword(password: string): string | null {
  if (typeof password !== 'string') return '密码无效';
  if (password.length < 6 || password.length > 64) return '密码长度需为 6-64 个字符';
  return null;
}

/** scrypt password hash. Stored format: scrypt$<saltHex>$<hashHex>. Never store plaintext. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const actual = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export interface SessionUser {
  id: number;
  username: string;
}

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
}

export function getUserByUsername(username: string): UserRow | undefined {
  return getDb()
    .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    .get(username) as UserRow | undefined;
}

export function createSession(userId: number): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    now,
    now + SESSION_MAX_AGE_SECONDS * 1000,
  );
  return token;
}

export function getSessionUser(req: NextRequest): SessionUser | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id AS id, u.username AS username
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, Date.now()) as { id: number; username: string } | undefined;
  return row ? { id: row.id, username: row.username } : null;
}

export function deleteSession(token: string): void {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/** Minimal in-memory login brute-force guard: 10 failed attempts per IP per 5 minutes. */
const loginFailures = new Map<string, { count: number; resetAt: number }>();
const LOGIN_MAX_FAILURES = 10;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

export function loginAllowed(ip: string): boolean {
  const entry = loginFailures.get(ip);
  if (!entry) return true;
  if (Date.now() > entry.resetAt) {
    loginFailures.delete(ip);
    return true;
  }
  return entry.count < LOGIN_MAX_FAILURES;
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const entry = loginFailures.get(ip);
  if (!entry || now > entry.resetAt) {
    loginFailures.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function resetLoginFailures(ip: string): void {
  loginFailures.delete(ip);
}

/** Record a successful login (user, IP, device, time) for admin review only. */
export function recordLogin(userId: number, ip: string, userAgent: string): void {
  getDb()
    .prepare('INSERT INTO login_log (user_id, ip, user_agent, created_at) VALUES (?, ?, ?, ?)')
    .run(userId, ip, userAgent.slice(0, 512), Date.now());
}

export function getClientIp(req: NextRequest): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}
