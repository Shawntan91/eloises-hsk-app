'use client';

import { useEffect, useState } from 'react';
import {
  login,
  logout,
  registerAccount,
  syncNow,
  type AuthResult,
  type SyncUser,
} from '@/utils/cloudSync';

export type AuthModalMode = 'login' | 'register' | 'account';

interface Props {
  open: boolean;
  initialMode: AuthModalMode;
  allowRegister: boolean;
  user: SyncUser | null;
  onClose: () => void;
  onAuthed: (user: SyncUser) => void;
  onLoggedOut: () => void;
}

export default function AuthModal({ open, initialMode, allowRegister, user, onClose, onAuthed, onLoggedOut }: Props) {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError('');
      setInfo('');
      if (initialMode !== 'account') {
        setPassword('');
        setCode('');
      }
    }
  }, [open, initialMode]);

  if (!open) return null;

  const handleResult = (r: AuthResult) => {
    if (r.ok && r.user) {
      onAuthed(r.user);
      onClose();
    } else {
      setError(r.error || '操作失败');
    }
  };

  const submit = async () => {
    setError('');
    setInfo('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    if (mode === 'register' && !code.trim()) {
      setError('注册需要卡密');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') handleResult(await login(username.trim(), password));
      else if (mode === 'register') handleResult(await registerAccount(username.trim(), password, code.trim()));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'account' ? '我的账号' : mode === 'login' ? '登录云同步' : '注册云同步账号'}
          </h2>
          <button onClick={onClose} className="text-xl leading-none text-gray-400 hover:text-gray-700">
            ×
          </button>
        </div>

        {mode === 'account' && user ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              当前账号：<span className="font-semibold">{user.username}</span>
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-600">{info}</p>}
            <button
              onClick={() => {
                void syncNow();
                setInfo('已触发同步');
              }}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              立即同步
            </button>
            <button
              onClick={async () => {
                await logout();
                onLoggedOut();
                onClose();
              }}
              className="w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              退出登录
            </button>
            <p className="text-xs leading-relaxed text-gray-400">
              未登录时 App 仍可离线使用，数据只保存在本机；登录后做题记录、错题、进度会在多设备间同步。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                  mode === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                登录
              </button>
              {allowRegister && (
                <button
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                    mode === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  注册
                </button>
              )}
            </div>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="用户名（3-32 个字符）"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="密码（至少 6 位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submit();
              }}
            />
            {mode === 'register' && (
              <>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="卡密（必填，16 位字母或数字）"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <p className="text-xs leading-relaxed text-gray-500">
                  注册必须凭有效未使用的卡密；一张卡密只能注册一个账号。
                </p>
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={busy}
              onClick={() => void submit()}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
            </button>
            {!allowRegister && mode === 'register' && (
              <p className="text-xs text-gray-500">注册已关闭，请直接登录。</p>
            )}
            <p className="text-xs leading-relaxed text-gray-400">
              登录后本机已有做题数据会自动上传到云端（不会丢失），并在多设备间同步。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
