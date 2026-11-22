// 云端同步引擎：localStorage 仍是本地事实来源，服务器 SQLite 只做跨设备副本。
// 未登录时完全不联网，App 照常离线使用；登录后才开启同步。
// 同步策略：每条记录带 updatedAt，后写胜出（LWW）；删除用墓碑同步。

export interface SyncUser {
  id: number;
  username: string;
}

export interface AuthResult {
  ok: boolean;
  user?: SyncUser;
  error?: string;
}

export type SyncStatus =
  | { state: 'logged-out' }
  | { state: 'syncing' }
  | { state: 'ok'; at: number }
  | { state: 'error'; at: number };

const META_KEY = 'hsk_sync_meta_v1';
const DEVICE_KEY = 'hsk_sync_device_id';
const MAX_VALUE_BYTES = 2 * 1024 * 1024;
const DEBOUNCE_MS = 8000;
const FETCH_TIMEOUT_MS = 12000;

interface KeyMeta {
  hash: string;
  updatedAt: number;
}

interface SyncMeta {
  userId: number;
  deviceId: string;
  migrated: boolean;
  keys: Record<string, KeyMeta>;
  deleted: Record<string, number>;
}

export interface ServerRecord {
  key: string;
  value: string | null;
  updatedAt: number;
}

let currentUser: SyncUser | null = null;
let allowRegisterFlag = false;
let status: SyncStatus = { state: 'logged-out' };
let statusListener: ((s: SyncStatus) => void) | null = null;
let started = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<void> | null = null;
let suppressHook = false;

function setStatus(s: SyncStatus) {
  status = s;
  statusListener?.(s);
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function getCurrentUser(): SyncUser | null {
  return currentUser;
}

export function getAllowRegister(): boolean {
  return allowRegisterFlag;
}

/**
 * 与服务端一致的同步白名单。
 * 同步 hskapp: 与 eloise_ 前缀的键；eloise_hsk_ai_config（含 API Key）、
 * hskapp:backup_snapshot（整库快照）与 legacy hsk_exam_* 旧键永不同步。
 */
export function isSyncableKey(key: string): boolean {
  if (!key || key.length > 128) return false;
  if (key.startsWith('hsk_sync_')) return false;
  if (key === 'eloise_hsk_ai_config') return false;
  if (key === 'hskapp:backup_snapshot') return false;
  if (key.startsWith('hskapp:')) return true;
  if (key.startsWith('eloise_')) return true;
  return false;
}

/** FNV-1a 哈希：只用于本地变更检测，不作安全用途。 */
export function hashValue(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage 满了或被禁用：本地照常使用内存，同步跳过
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function getDeviceId(): string {
  let id = safeGet(DEVICE_KEY);
  if (!id) {
    id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    safeSet(DEVICE_KEY, id);
  }
  return id;
}

interface LoadedMeta {
  meta: SyncMeta;
  /** 本机数据是否曾经在另一个账号下同步过。true 时绝不能把本机数据上传到当前账号名下。 */
  hadPriorUserSync: boolean;
}

function loadMeta(userId: number): LoadedMeta {
  const fresh = (): SyncMeta => ({ userId, deviceId: getDeviceId(), keys: {}, deleted: {}, migrated: false });
  try {
    const raw = safeGet(META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SyncMeta;
      if (parsed && parsed.keys) {
        if (parsed.userId === userId) {
          return {
            meta: {
              userId: parsed.userId,
              deviceId: parsed.deviceId || getDeviceId(),
              migrated: !!parsed.migrated,
              keys: parsed.keys,
              deleted: parsed.deleted || {},
            },
            hadPriorUserSync: false,
          };
        }
        // meta 属于另一个账号：本机数据是否已同步过，决定能否上传
        return { meta: fresh(), hadPriorUserSync: !!parsed.migrated };
      }
    }
  } catch {
    // ignore, rebuild below
  }
  return { meta: fresh(), hadPriorUserSync: false };
}

function saveMeta(meta: SyncMeta): void {
  safeSet(META_KEY, JSON.stringify(meta));
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || `请求失败 ${res.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** 不抛错的 POST：登录/注册/升级需要把服务端返回的错误（比如账号已过期）展示给用户。 */
async function postAuth(
  url: string,
  body: Record<string, string>,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: '网络不可用，请检查网络后重试' } };
  } finally {
    clearTimeout(timer);
  }
}

function toAuthResult(r: { ok: boolean; data: Record<string, unknown> }): AuthResult {
  if (r.ok && r.data.user) {
    return { ok: true, user: r.data.user as SyncUser };
  }
  return {
    ok: false,
    error: typeof r.data.error === 'string' ? r.data.error : '操作失败，请稍后再试',
  };
}

export async function refreshAuth(): Promise<SyncUser | null> {
  try {
    const data = (await fetchJson('/api/auth/me')) as { user: SyncUser | null; allowRegister: boolean };
    allowRegisterFlag = !!data.allowRegister;
    const next = data.user ?? null;
    if ((next?.id ?? null) !== (currentUser?.id ?? null)) {
      currentUser = next;
      if (next) {
        // 换账号后先做一次同步（新账号在本设备上走首次迁移流程）
        void syncNow();
      } else {
        setStatus({ state: 'logged-out' });
      }
    } else {
      currentUser = next;
      if (!next) setStatus({ state: 'logged-out' });
    }
    return currentUser;
  } catch {
    // 离线时不改变登录态显示，本地照常使用
    return currentUser;
  }
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const r = await postAuth('/api/auth/login', { username, password });
  const result = toAuthResult(r);
  if (!result.ok || !result.user) return result;
  currentUser = result.user;
  setStatus({ state: 'syncing' });
  await syncNow();
  return result;
}

export async function registerAccount(
  username: string,
  password: string,
  code: string,
): Promise<AuthResult> {
  const r = await postAuth('/api/auth/register', { username, password, code });
  const result = toAuthResult(r);
  if (!result.ok || !result.user) return result;
  currentUser = result.user;
  setStatus({ state: 'syncing' });
  await syncNow();
  return result;
}

export async function logout(): Promise<void> {
  try {
    await fetchJson('/api/auth/logout', { method: 'POST' });
  } catch {
    // 即使请求失败也清除本地会话认知；cookie 由服务端在下次请求时失效处理
  }
  currentUser = null;
  setStatus({ state: 'logged-out' });
}

function collectLocalRecords(meta: SyncMeta): ServerRecord[] {
  const out: ServerRecord[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !isSyncableKey(key)) continue;
      const value = safeGet(key);
      if (value === null) continue;
      if (new Blob([value]).size > MAX_VALUE_BYTES) continue;
      const prev = meta.keys[key];
      const h = hashValue(value);
      if (!prev || prev.hash !== h) {
        out.push({ key, value, updatedAt: prev?.updatedAt ?? Date.now() });
      }
    }
  } catch {
    // ignore
  }
  // 墓碑：本地已删除但服务端可能还留着的键
  for (const [key, deletedAt] of Object.entries(meta.deleted)) {
    out.push({ key, value: null, updatedAt: deletedAt });
  }
  return out;
}

function applyServerRecords(meta: SyncMeta, records: ServerRecord[]): void {
  suppressHook = true;
  try {
    for (const rec of records) {
      const prev = meta.keys[rec.key];
      if (rec.value === null) {
        // 服务端墓碑：只有当本地版本更旧时才删除
        if (!prev || rec.updatedAt > prev.updatedAt) {
          safeRemove(rec.key);
          delete meta.keys[rec.key];
          meta.deleted[rec.key] = rec.updatedAt;
        }
        continue;
      }
      if (!prev || rec.updatedAt > prev.updatedAt) {
        safeSet(rec.key, rec.value);
        meta.keys[rec.key] = { hash: hashValue(rec.value), updatedAt: rec.updatedAt };
        delete meta.deleted[rec.key];
      }
    }
  } finally {
    suppressHook = false;
  }
}

async function postRecords(records: ServerRecord[]): Promise<ServerRecord[]> {
  if (records.length === 0) return [];
  const data = (await fetchJson('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: getDeviceId(), records }),
  })) as { records?: ServerRecord[] };
  return Array.isArray(data.records) ? data.records : [];
}

export async function syncNow(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  const run = (async () => {
    if (!currentUser) {
      setStatus({ state: 'logged-out' });
      return;
    }
    setStatus({ state: 'syncing' });
    try {
      const user = currentUser;
      const { meta, hadPriorUserSync } = loadMeta(user.id);
      const serverData = (await fetchJson('/api/sync')) as { records?: ServerRecord[] };
      const serverRecords = Array.isArray(serverData.records) ? serverData.records : [];

      if (!meta.migrated) {
        // 首次迁移：本机已有数据绝不能丢。
        // 若本机数据之前在另一个账号下同步过，则不上传，只拉取当前账号服务端的数据覆盖重叠键，
        // 避免把旧账号的数据串到新账号名下。
        if (!hadPriorUserSync) {
          const localRecords: ServerRecord[] = [];
          const now = Date.now();
          try {
            for (let i = 0; i < window.localStorage.length; i++) {
              const key = window.localStorage.key(i);
              if (!key || !isSyncableKey(key)) continue;
              const value = safeGet(key);
              if (value === null) continue;
              if (new Blob([value]).size > MAX_VALUE_BYTES) continue;
              localRecords.push({ key, value, updatedAt: now });
              meta.keys[key] = { hash: hashValue(value), updatedAt: now };
            }
          } catch {
            // ignore
          }
          if (localRecords.length > 0) {
            await postRecords(localRecords);
          }
          // 拉取服务端有、本机没有的键（补齐另一台设备的数据）
          const serverOnly = serverRecords.filter((r) => r.value !== null && safeGet(r.key) === null);
          applyServerRecords(meta, serverOnly);
        } else {
          // 换账号：服务端数据为准，直接覆盖本机重叠键
          applyServerRecords(meta, serverRecords);
        }
        meta.migrated = true;
        saveMeta(meta);
      } else {
        applyServerRecords(meta, serverRecords);
        const changes = collectLocalRecords(meta);
        if (changes.length > 0) {
          const merged = await postRecords(changes);
          applyServerRecords(meta, merged);
          // 推送成功的键更新 meta
          for (const c of changes) {
            if (c.value !== null) {
              meta.keys[c.key] = { hash: hashValue(c.value), updatedAt: c.updatedAt };
            } else {
              delete meta.keys[c.key];
            }
          }
        }
        saveMeta(meta);
      }
      setStatus({ state: 'ok', at: Date.now() });
    } catch {
      // 离线或服务端不可用：静默失败，本地照常使用
      setStatus({ state: 'error', at: Date.now() });
    }
  })();
  syncInFlight = run.finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

function scheduleSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
}

function installStorageHook(): void {
  if (typeof window === 'undefined') return;
  const rawSet = window.localStorage.setItem.bind(window.localStorage);
  const rawRemove = window.localStorage.removeItem.bind(window.localStorage);
  const ls = window.localStorage as Storage & { __cloudSyncHooked?: boolean };
  if (ls.__cloudSyncHooked) return;
  ls.__cloudSyncHooked = true;
  window.localStorage.setItem = (key: string, value: string) => {
    rawSet(key, value);
    if (!suppressHook && isSyncableKey(key) && currentUser) scheduleSync();
  };
  window.localStorage.removeItem = (key: string) => {
    rawRemove(key);
    if (suppressHook || !isSyncableKey(key) || !currentUser) return;
    // 记录墓碑，让删除也能同步到其他设备
    const { meta } = loadMeta(currentUser.id);
    meta.deleted[key] = Date.now();
    delete meta.keys[key];
    saveMeta(meta);
    scheduleSync();
  };
}

/** 在根布局挂载一次。未登录时只做登录态检查，不产生任何同步流量。 */
export function startCloudSync(listener: (s: SyncStatus) => void): () => void {
  statusListener = listener;
  if (started) {
    void refreshAuth();
    return () => undefined;
  }
  started = true;
  installStorageHook();
  void refreshAuth().then(() => {
    if (currentUser) setTimeout(() => void syncNow(), 1500);
  });
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') void syncNow();
  };
  const onFocus = () => void syncNow();
  const onOnline = () => void syncNow();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onFocus);
  window.addEventListener('online', onOnline);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('online', onOnline);
  };
}
