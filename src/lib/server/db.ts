import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

/**
 * SQLite singleton. DB file lives at <app-root>/data/app.db (NOT in git).
 * WAL mode so concurrent reads/writes from route handlers don't block each other.
 *
 * Tables:
 *  users    - 账号（HSK 站不开放注册，账号由管理员直接在库里建；无卡密）。
 *  sessions - 登录会话 token（HTTP-only cookie 下发）。
 *  kv       - 按 (user_id, key) 隔离的同步数据，后写胜出。
 *  login_log - 成功登录记录（用户、IP、设备、时间），仅管理员在服务器上查看。
 */
export function getDb(): Database.Database {
  if (db) return db;
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  db = new Database(path.join(dir, 'app.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kv (
      user_id INTEGER NOT NULL REFERENCES users(id),
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      device_id TEXT,
      PRIMARY KEY (user_id, key)
    );
    CREATE INDEX IF NOT EXISTS idx_kv_user_updated ON kv(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS login_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      ip TEXT NOT NULL,
      user_agent TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_log_user_created ON login_log(user_id, created_at);
  `);
  return db;
}
