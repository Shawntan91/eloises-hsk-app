"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Lock, ArrowRight } from "lucide-react";

interface OralLoginGateProps {
  isZh: boolean;
  onAuthorized: () => void;
}

/** 未登录时挡在口语工作室前的登录提示：点按钮打开 HSK 登录弹窗，登录后自动放行。 */
export const OralLoginGate: React.FC<OralLoginGateProps> = ({
  isZh,
  onAuthorized,
}) => {
  const [waiting, setWaiting] = useState(false);
  const onAuthorizedRef = useRef(onAuthorized);
  onAuthorizedRef.current = onAuthorized;

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/oral/auth");
      const data = await res.json();
      if (Boolean(data.authorized)) {
        onAuthorizedRef.current();
        return true;
      }
    } catch {
      // 网络异常时忽略，等下一次轮询
    }
    return false;
  }, []);

  // 登录弹窗在根布局的 CloudSyncBootstrap 里；登录完成后这里轮询到已授权就放行。
  useEffect(() => {
    const timer = window.setInterval(() => {
      void checkAuth();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [checkAuth]);

  const handleLoginClick = () => {
    window.dispatchEvent(new Event("hsk-open-login"));
    setWaiting(true);
    void checkAuth();
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-md mb-4">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-slate-900">
          {isZh ? "登录后使用生活口语" : "로그인 후 회화 스튜디오 이용하기"}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 mb-6">
          {isZh
            ? "生活口语是账号功能，请先登录你的 HSK 账号。登录一次后 30 天内不用再登。"
            : "회화 스튜디오는 계정 기능입니다. HSK 계정으로 먼저 로그인해 주세요. 한 번 로그인하면 30일간 유지됩니다."}
        </p>

        <button
          type="button"
          onClick={handleLoginClick}
          className="w-full min-h-[44px] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm"
        >
          <span>
            {isZh ? "去登录 HSK 账号" : "HSK 계정으로 로그인"}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => void checkAuth()}
          className="mt-3 text-xs font-medium text-slate-400 hover:text-emerald-600"
        >
          {waiting
            ? isZh
              ? "等待登录完成…"
              : "로그인 대기 중…"
            : isZh
              ? "我已登录，刷新状态"
              : "이미 로그인했어요. 상태 새로고침"}
        </button>
      </div>
    </div>
  );
};

export default OralLoginGate;
