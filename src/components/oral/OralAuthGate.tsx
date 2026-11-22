"use client";

import React, { useState } from "react";
import { Lock, KeyRound, ArrowRight, AlertCircle } from "lucide-react";

interface OralAuthGateProps {
  isZh: boolean;
  onAuthorized: () => void;
}

export const OralAuthGate: React.FC<OralAuthGateProps> = ({
  isZh,
  onAuthorized,
}) => {
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/oral/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.authorized) {
        onAuthorized();
      } else {
        setError(
          data.message ||
            (isZh ? "口令不正确，请重试。" : "암호가 올바르지 않습니다.")
        );
      }
    } catch {
      setError(isZh ? "网络异常，请重试。" : "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-slate-900">
          {isZh ? "解锁生活口语工作室" : "중국 생활 회화 스튜디오 잠금 해제"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 mb-6">
          {isZh
            ? "请输入专属访问口令，验证后将自动记住登录状态。"
            : "전용 접속 암호를 입력해 주세요. 한 번 인증하면 로그인 상태가 유지됩니다."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder={isZh ? "输入访问口令..." : "접속 암호 입력..."}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium px-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !passcode.trim()}
            className="w-full min-h-[44px] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm"
          >
            <span>
              {loading
                ? isZh
                  ? "验证中..."
                  : "확인 중..."
                : isZh
                ? "进入口语练习"
                : "회화 스튜디오 입장"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default OralAuthGate;
