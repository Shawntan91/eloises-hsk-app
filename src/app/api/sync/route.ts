import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server/db';
import { getSessionUser } from '@/lib/server/auth';
import { isSyncableKey } from '@/lib/server/syncKeys';

export const dynamic = 'force-dynamic';

const MAX_RECORDS_PER_REQUEST = 500;
const MAX_VALUE_BYTES = 2 * 1024 * 1024;

interface SyncRecord {
  key: string;
  value: string;
  updatedAt: number;
}

function rowToRecord(row: { key: string; value: string; updated_at: number }): SyncRecord {
  return { key: row.key, value: row.value, updatedAt: row.updated_at };
}

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const db = getDb();
  const sinceRaw = new URL(req.url).searchParams.get('since');
  const since = sinceRaw ? Number(sinceRaw) : 0;
  const rows = (
    Number.isFinite(since) && since > 0
      ? db.prepare('SELECT key, value, updated_at FROM kv WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC').all(user.id, since)
      : db.prepare('SELECT key, value, updated_at FROM kv WHERE user_id = ? ORDER BY updated_at ASC').all(user.id)
  ) as { key: string; value: string; updated_at: number }[];
  return NextResponse.json({ records: rows.map(rowToRecord) });
}

export async function POST(req: NextRequest) {
  const user = getSessionUser(req);
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效 JSON' }, { status: 400 });
  }
  const records = (body as { records?: unknown })?.records;
  if (!Array.isArray(records) || records.length > MAX_RECORDS_PER_REQUEST) {
    return NextResponse.json({ error: 'records 字段无效' }, { status: 400 });
  }
  const deviceId =
    typeof (body as { deviceId?: unknown })?.deviceId === 'string'
      ? ((body as { deviceId: string }).deviceId.slice(0, 64) as string)
      : null;

  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO kv (user_id, key, value, updated_at, device_id) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at,
       device_id = excluded.device_id
     WHERE excluded.updated_at > kv.updated_at`,
  );
  let applied = 0;
  const apply = db.transaction((items: SyncRecord[]) => {
    for (const r of items) {
      if (
        typeof r.key !== 'string' ||
        typeof r.value !== 'string' ||
        typeof r.updatedAt !== 'number' ||
        !Number.isFinite(r.updatedAt) ||
        !isSyncableKey(r.key) ||
        Buffer.byteLength(r.value, 'utf8') > MAX_VALUE_BYTES
      ) {
        continue;
      }
      const info = upsert.run(user.id, r.key, r.value, Math.floor(r.updatedAt), deviceId);
      if (info.changes > 0) applied += 1;
    }
  });
  try {
    apply(records as SyncRecord[]);
  } catch {
    return NextResponse.json({ error: '写入失败' }, { status: 500 });
  }
  const rows = db
    .prepare('SELECT key, value, updated_at FROM kv WHERE user_id = ? ORDER BY updated_at ASC')
    .all(user.id) as { key: string; value: string; updated_at: number }[];
  return NextResponse.json({ ok: true, applied, records: rows.map(rowToRecord) });
}
