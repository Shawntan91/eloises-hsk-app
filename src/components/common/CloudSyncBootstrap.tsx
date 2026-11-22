'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import AuthModal, { type AuthModalMode } from './AuthModal';
import {
  getAllowRegister,
  getCurrentUser,
  getSyncStatus,
  startCloudSync,
  type SyncStatus,
  type SyncUser,
} from '@/utils/cloudSync';

function statusText(status: SyncStatus, user: SyncUser | null): string {
  if (status.state === 'logged-out' || !user) return '未登录 · 云同步';
  if (status.state === 'syncing') return '同步中…';
  if (status.state === 'error') return '同步失败（离线可用）';
  const time = new Date(status.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return `${user.username} · 已同步 ${time}`;
}

const POS_KEY = 'hsk_sync_pill_pos';
const HIDDEN_KEY = 'hsk_sync_pill_hidden';

type Pos = { x: number; y: number };

/** 挂在根布局：启动同步引擎 + 账号/同步状态入口。未登录时不产生同步流量。
 * 状态条可以拖到任意位置（位置只存本机，不会同步到别的设备），点 × 可隐藏，
 * 隐藏后在原位置留一个小云朵圆钮，点它恢复。 */
export default function CloudSyncBootstrap() {
  const [user, setUser] = useState<SyncUser | null>(null);
  const [status, setStatus] = useState<SyncStatus>({ state: 'logged-out' });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<AuthModalMode>('login');
  const [allowRegister, setAllowRegister] = useState(true);
  const [pos, setPos] = useState<Pos | null>(null);
  const [hidden, setHidden] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const posRef = useRef<Pos | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const movedRef = useRef(false);

  const clampPos = useCallback((p: Pos): Pos => {
    const el = wrapRef.current;
    const w = el ? el.offsetWidth : 220;
    const h = el ? el.offsetHeight : 36;
    const maxX = Math.max(8, window.innerWidth - w - 8);
    const maxY = Math.max(8, window.innerHeight - h - 8);
    return { x: Math.min(Math.max(8, p.x), maxX), y: Math.min(Math.max(8, p.y), maxY) };
  }, []);

  useEffect(() => {
    const cleanup = startCloudSync((s) => {
      setStatus(s);
      setUser(getCurrentUser());
      setAllowRegister(getAllowRegister());
    });
    setUser(getCurrentUser());
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Pos;
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          const c = clampPos(p);
          posRef.current = c;
          setPos(c);
        }
      }
      if (localStorage.getItem(HIDDEN_KEY) === '1') setHidden(true);
    } catch {
      // 本地记录损坏时忽略，用默认位置
    }
    // 口语页未登录时点「去登录」会派发该事件，在此打开登录弹窗。
    const openLogin = () => {
      setModalMode('login');
      setModalOpen(true);
    };
    window.addEventListener('hsk-open-login', openLogin);
    return () => {
      cleanup();
      window.removeEventListener('hsk-open-login', openLogin);
    };
  }, [clampPos]);

  useEffect(() => {
    const onResize = () => {
      if (posRef.current) {
        const c = clampPos(posRef.current);
        posRef.current = c;
        setPos(c);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clampPos]);

  const openModal = (mode: AuthModalMode) => {
    setModalMode(mode);
    setModalOpen(true);
  };

  const handlePillClick = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    openModal(user ? 'account' : 'login');
  };

  const hidePill = () => {
    setHidden(true);
    try {
      localStorage.setItem(HIDDEN_KEY, '1');
    } catch {
      // 忽略
    }
  };

  const restorePill = () => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setHidden(false);
    try {
      localStorage.removeItem(HIDDEN_KEY);
    } catch {
      // 忽略
    }
  };

  // 注意：不要用 setPointerCapture —— 捕获后 click 会被改派到外层 div，
  // 按钮收不到点击（2026-11-20 因此导致登录点不开）。改用 window 级监听。
  const handleWindowMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) > 6) {
        d.moved = true;
        movedRef.current = true;
      }
      if (d.moved) {
        const c = clampPos({ x: d.origX + dx, y: d.origY + dy });
        posRef.current = c;
        setPos(c);
      }
    },
    [clampPos],
  );

  const handleWindowUp = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    window.removeEventListener('pointermove', handleWindowMove);
    window.removeEventListener('pointerup', handleWindowUp);
    window.removeEventListener('pointercancel', handleWindowUp);
    if (d?.moved && posRef.current) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
      } catch {
        // 忽略
      }
    }
  }, [handleWindowMove]);

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowUp);
      window.removeEventListener('pointercancel', handleWindowUp);
    },
    [handleWindowMove, handleWindowUp],
  );

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    movedRef.current = false;
    const el = wrapRef.current;
    const rect = el ? el.getBoundingClientRect() : null;
    const origin = posRef.current ?? (rect ? { x: rect.left, y: rect.top } : { x: 0, y: 0 });
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: origin.x, origY: origin.y, moved: false };
    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowUp);
    window.addEventListener('pointercancel', handleWindowUp);
  };

  return (
    <>
      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        style={pos ? { left: pos.x, top: pos.y } : undefined}
        className={
          (pos ? 'fixed z-40 ' : 'fixed bottom-4 right-4 z-40 ') +
          'touch-none select-none cursor-grab active:cursor-grabbing'
        }
      >
        {hidden ? (
          <button
            type="button"
            onClick={restorePill}
            aria-label="显示同步状态"
            title="显示同步状态"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900/85 text-white shadow-lg backdrop-blur hover:bg-gray-900"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
          </button>
        ) : (
          <div className="flex items-center rounded-full bg-gray-900/85 shadow-lg backdrop-blur">
            <button
              type="button"
              onClick={handlePillClick}
              className="max-w-[70vw] truncate rounded-full px-4 py-2 text-xs text-white hover:bg-gray-900"
              title={user ? '账号与云同步' : '登录云同步，多设备互通'}
            >
              {statusText(status, user)}
            </button>
            <button
              type="button"
              aria-label="隐藏同步状态"
              title="隐藏（点小圆钮可恢复）"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                hidePill();
              }}
              className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm leading-none text-white/70 hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
      </div>
      <AuthModal
        open={modalOpen}
        initialMode={modalMode}
        allowRegister={allowRegister}
        user={user}
        onClose={() => setModalOpen(false)}
        onAuthed={(u) => {
          setUser(u);
          setStatus(getSyncStatus());
        }}
        onLoggedOut={() => {
          setUser(null);
          setStatus({ state: 'logged-out' });
        }}
      />
    </>
  );
}
