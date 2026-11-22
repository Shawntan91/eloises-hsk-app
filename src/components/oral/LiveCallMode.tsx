"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Headphones,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  Circle,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { OralScenario, OralDebriefResult } from "@/types/oral";
import {
  LiveAudioClient,
  LiveConnectionState,
} from "@/lib/oral/liveAudioClient";
import { oralStorage } from "@/lib/oral/storage";
import { recordStudyTime } from "@/utils/studyStats";
import { logActivity } from "@/utils/activityLogger";
import RubyText from "./RubyText";

interface TranscriptEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface LiveCallModeProps {
  scenario: OralScenario;
  isZh: boolean;
  onSwitchToRoleplay: () => void;
}

export const LiveCallMode: React.FC<LiveCallModeProps> = ({
  scenario,
  isZh,
  onSwitchToRoleplay,
}) => {
  const [connState, setConnState] = useState<LiveConnectionState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [liveUserDraft, setLiveUserDraft] = useState("");
  const [liveModelDraft, setLiveModelDraft] = useState("");

  const [isDebriefing, setIsDebriefing] = useState(false);
  const [debrief, setDebrief] = useState<OralDebriefResult | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  const clientRef = useRef<LiveAudioClient | null>(null);
  const callStartRef = useRef<number>(0);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const subtitleEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    transcriptRef.current = transcript;
    subtitleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, liveUserDraft, liveModelDraft]);

  useEffect(() => {
    const loadSaved = async () => {
      const phrases = await oralStorage.getPhrases();
      setSavedSet(new Set(phrases.map((p) => p.zh.trim())));
    };
    loadSaved();
    window.addEventListener("oral-phrasebook-changed", loadSaved);
    return () => {
      window.removeEventListener("oral-phrasebook-changed", loadSaved);
      clientRef.current?.disconnect();
    };
  }, []);

  const appendTranscript = (role: "user" | "assistant", text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setTranscript((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role) {
        return [
          ...prev.slice(0, -1),
          { ...last, text: `${last.text} ${clean}`.trim() },
        ];
      }
      return [
        ...prev,
        { id: `${role}_${Date.now()}_${Math.random()}`, role, text: clean },
      ];
    });
  };

  const handleStartCall = async () => {
    setErrorMsg(null);
    setDebrief(null);
    setTranscript([]);
    setLiveUserDraft("");
    setLiveModelDraft("");
    setIsMuted(false);
    setConnState("connecting");
    callStartRef.current = Date.now();

    try {
      const tokenRes = await fetch("/api/oral/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.token) {
        throw new Error(tokenData.message || "Failed to get live token");
      }

      const client = new LiveAudioClient({
        onStateChange: (state, msg) => {
          setConnState(state);
          if (state === "error" && msg) {
            setErrorMsg(
              msg === "CONNECTION_TIMEOUT"
                ? isZh
                  ? "连接超时（8秒）：当前网络可能无法直连 Google 实时语音服务，建议切换回「回合制实战模式」。"
                  : "연결 시간 초과(8초): 현재 네트워크에서 Google 실시간 음성 연결이 원활하지 않아요. 「AI 롤플레이」 모드를 이용해 보세요."
                : msg
            );
          }
        },
        onUserTranscript: (text, isFinal) => {
          if (isFinal) {
            setLiveUserDraft("");
            appendTranscript("user", text);
          } else {
            setLiveUserDraft(text);
          }
        },
        onModelTranscript: (text, isFinal) => {
          if (isFinal) {
            setLiveModelDraft("");
            appendTranscript("assistant", text);
          } else {
            setLiveModelDraft(text);
          }
        },
        onModelSpeakingChange: (speaking) => {
          setIsModelSpeaking(speaking);
        },
      });

      clientRef.current = client;
      await client.connect(tokenData.token, tokenData.model);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setConnState("error");
      if (!errorMsg) {
        setErrorMsg(
          msg === "CONNECTION_TIMEOUT"
            ? isZh
              ? "连接超时（8秒）：当前网络可能无法直连 Google 实时语音服务，建议切换回「回合制实战模式」。"
              : "연결 시간 초과(8초): 현재 네트워크에서 Google 실시간 음성 연결이 원활하지 않아요. 「AI 롤플레이」 모드를 이용해 보세요."
            : msg
        );
      }
    }
  };

  const handleHangUp = async () => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setIsModelSpeaking(false);
    setConnState("closed");

    // Flush any remaining drafts
    const finalTranscript = [...transcriptRef.current];
    if (liveUserDraft.trim()) {
      finalTranscript.push({
        id: `user_end_${Date.now()}`,
        role: "user",
        text: liveUserDraft.trim(),
      });
    }
    if (liveModelDraft.trim()) {
      finalTranscript.push({
        id: `ai_end_${Date.now()}`,
        role: "assistant",
        text: liveModelDraft.trim(),
      });
    }

    setIsDebriefing(true);
    try {
      const res = await fetch("/api/oral/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          transcript: finalTranscript.map((t) => ({
            role: t.role,
            text: t.text,
          })),
        }),
      });
      const data = (await res.json()) as OralDebriefResult;
      if (res.ok) {
        setDebrief(data);
        const completedIds = data.completedGoalIds || [];
        await oralStorage.saveScenarioProgress(
          scenario.id,
          completedIds,
          completedIds.length >= scenario.goals.length
        );
      }
    } catch {
      // ignore debrief network failure gracefully
    } finally {
      setIsDebriefing(false);
      const elapsedSec = Math.max(
        15,
        Math.round((Date.now() - callStartRef.current) / 1000)
      );
      recordStudyTime(Math.max(1, Math.round(elapsedSec / 60)));
      logActivity({
        type: "shadowing",
        durationSec: elapsedSec,
        meta: {
          module: "oral_live_call",
          scenarioId: scenario.id,
          scenarioTitle: scenario.titleZh,
        },
      });
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    clientRef.current?.setMuted(next);
  };

  const handleSavePhrase = async (
    zh: string,
    ko: string,
    noteKo?: string
  ) => {
    await oralStorage.savePhrase({
      zh,
      ko,
      noteKo,
      scenarioId: scenario.id,
      scenarioTitleZh: scenario.titleZh,
      scenarioTitleKo: scenario.titleKo,
      source: "debrief",
    });
  };

  // 1. Pre-call Screen
  if (connState === "idle") {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="text-center max-w-md mx-auto space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg">
            <PhoneCall className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900">
            {isZh ? "实时语音通话实战" : "실시간 AI 음성 통화 연습"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isZh
              ? "像打微信语音一样直接开口对话，支持随时打断和自然接话；挂断后自动生成韩语复盘与地道表达卡片。"
              : "실제 전화 통화처럼 편하게 중국어로 대화해 보세요. 중간에 말을 끊고 들어가도 괜찮으며, 통화 종료 후 한국어 피드백이 자동 생성됩니다."}
          </p>
        </div>

        <div className="max-w-md mx-auto bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-indigo-900">
          <Headphones className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            {isZh
              ? "轻提示：建议佩戴耳机通话，防止扬声器回声干扰语音识别。"
              : "권장 팁: 에코 방지를 위해 이어폰을 착용하고 통화하면 인식이 훨씬 정확해요."}
          </span>
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <p className="text-xs font-extrabold text-slate-700">
            {isZh ? "🎯 本次通话目标：" : "🎯 이번 통화 미션:"}
          </p>
          {scenario.goals.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700"
            >
              <Circle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{isZh ? g.zh : g.ko}</span>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleStartCall}
            className="min-h-[48px] px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm inline-flex items-center gap-2 shadow-md transition select-none touch-manipulation"
          >
            <PhoneCall className="w-4 h-4" />
            <span>
              {isZh ? "开始实时语音通话" : "실시간 음성 통화 시작"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Error / Timeout Fallback Screen
  if (connState === "error") {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-900">
          {isZh ? "实时语音连接中断" : "실시간 통화 연결에 실패했어요"}
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {errorMsg}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onSwitchToRoleplay}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              {isZh ? "一键切换「回合制实战模式」" : "「AI 롤플레이」 모드로 전환"}
            </span>
          </button>
          <button
            type="button"
            onClick={handleStartCall}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isZh ? "重试连接" : "다시 연결"}</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Post-Call Debrief Screen
  if (connState === "closed") {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {isZh ? "通话复盘报告" : "통화 종료 · AI 학습 리포트"}
              </h3>
              <p className="text-xs text-slate-500">
                {isZh ? scenario.titleZh : scenario.titleKo}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConnState("idle")}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>{isZh ? "再打一通" : "다시 통화하기"}</span>
          </button>
        </div>

        {isDebriefing ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
            <span>
              {isZh
                ? "正在为你生成韩语复盘与地道表达建议..."
                : "방금 나눈 대화를 분석해 피드백을 만들고 있어요..."}
            </span>
          </div>
        ) : debrief ? (
          <div className="space-y-5">
            {/* Goal Completion */}
            <div className="flex flex-wrap gap-2">
              {scenario.goals.map((g) => {
                const done = debrief.completedGoalIds.includes(g.id);
                return (
                  <span
                    key={g.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                      done
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-300" />
                    )}
                    <span>{isZh ? g.zh : g.ko}</span>
                  </span>
                );
              })}
            </div>

            {/* Warm Korean Summary */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 text-sm text-indigo-950 leading-relaxed">
              {debrief.summaryKo}
            </div>

            {/* Expression Upgrades */}
            {debrief.upgrades.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">
                  💡 더 자연스러운 표현 ({isZh ? "更地道的说法" : "자연스러운 표현 업그레이드"})
                </h4>
                {debrief.upgrades.map((u, idx) => {
                  const saved = savedSet.has(u.naturalZh.trim());
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-1.5"
                    >
                      <p className="text-xs text-slate-500 line-through">
                        {u.userSaid}
                      </p>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-emerald-900">
                          <RubyText text={u.naturalZh} showPinyin={true} />
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            handleSavePhrase(u.naturalZh, u.explanationKo)
                          }
                          className={`p-1.5 rounded-lg shrink-0 ${
                            saved
                              ? "bg-amber-100 text-amber-700"
                              : "bg-white border border-amber-200 text-slate-500 hover:text-amber-700"
                          }`}
                        >
                          {saved ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-600">{u.explanationKo}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recommended Phrases */}
            {debrief.recommendedPhrases.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">
                  📌 {isZh ? "推荐收藏实用表达" : "저장 추천 실전 표현"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {debrief.recommendedPhrases.map((p, idx) => {
                    const saved = savedSet.has(p.zh.trim());
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">
                            <RubyText text={p.zh} showPinyin={true} />
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">{p.ko}</p>
                          {p.noteKo && (
                            <p className="text-[11px] text-slate-500 mt-1">
                              {p.noteKo}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleSavePhrase(p.zh, p.ko, p.noteKo)
                          }
                          className={`p-1.5 rounded-lg shrink-0 ${
                            saved
                              ? "bg-amber-100 text-amber-700"
                              : "bg-white border border-slate-200 text-slate-500 hover:text-amber-700"
                          }`}
                        >
                          {saved ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  // 4. Connecting / Active Call Screen
  return (
    <div className="flex flex-col h-[calc(100dvh-230px)] min-h-[500px] bg-slate-900 text-white rounded-3xl overflow-hidden shadow-xl border border-slate-800">
      {/* Call Header */}
      <div className="px-4 py-3 bg-slate-800/70 border-b border-slate-700/70 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              connState === "connected"
                ? "bg-emerald-400 animate-pulse"
                : "bg-amber-400 animate-ping"
            }`}
          />
          <div>
            <p className="text-xs sm:text-sm font-bold">
              {connState === "connecting"
                ? isZh
                  ? "正在接通实时语音..."
                  : "실시간 통화 연결 중..."
                : isModelSpeaking
                ? isZh
                  ? "对方正在说话..."
                  : "상대방이 말하고 있어요..."
                : isMuted
                ? isZh
                  ? "已静音"
                  : "음소거됨"
                : isZh
                ? "通话中 · 请直接开口"
                : "통화 중 · 편하게 말씀하세요"}
            </p>
            <p className="text-[10px] text-slate-400">
              {isZh ? "建议佩戴耳机防回声" : "이어폰 착용 권장"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowPinyin((v) => !v)}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 ${
            showPinyin
              ? "bg-indigo-600/30 border-indigo-400/50 text-indigo-200"
              : "bg-slate-800 border-slate-700 text-slate-400"
          }`}
        >
          {showPinyin ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{isZh ? "拼音字幕" : "병음 자막"}</span>
        </button>
      </div>

      {/* Live Subtitles */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {transcript.length === 0 && !liveUserDraft && !liveModelDraft && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs space-y-2">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                isModelSpeaking
                  ? "bg-indigo-500/30 ring-4 ring-indigo-400/40 scale-105"
                  : "bg-slate-800"
              }`}
            >
              <span className="text-3xl">{scenario.icon}</span>
            </div>
            <p>
              {connState === "connecting"
                ? isZh
                  ? "正在建立安全加密语音通道..."
                  : "실시간 음성 채널을 연결하고 있어요..."
                : isZh
                ? "你可以先打个招呼，比如「你好！」"
                : "먼저 가볍게 인사해 보세요! (예: 你好!)"}
            </p>
          </div>
        )}

        {transcript.map((item) => (
          <div
            key={item.id}
            className={`flex ${
              item.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium ${
                item.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-100 border border-slate-700"
              }`}
            >
              {item.role === "assistant" ? (
                <RubyText text={item.text} showPinyin={showPinyin} />
              ) : (
                item.text
              )}
            </div>
          </div>
        ))}

        {liveUserDraft && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-emerald-600/60 text-white/90 italic">
              {liveUserDraft}
            </div>
          </div>
        )}

        {liveModelDraft && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-slate-800/80 text-slate-200 border border-slate-700">
              <RubyText text={liveModelDraft} showPinyin={showPinyin} />
            </div>
          </div>
        )}

        <div ref={subtitleEndRef} />
      </div>

      {/* Bottom Call Controls */}
      <div
        className="px-6 py-4 bg-slate-800/80 border-t border-slate-700/70 flex items-center justify-center gap-6 shrink-0"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={handleToggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition select-none touch-manipulation ${
            isMuted
              ? "bg-amber-500 text-white"
              : "bg-slate-700 hover:bg-slate-600 text-slate-100"
          }`}
          title={isMuted ? (isZh ? "取消静音" : "음소거 해제") : isZh ? "静音" : "음소거"}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        <button
          type="button"
          onClick={handleHangUp}
          className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition select-none touch-manipulation"
          title={isZh ? "挂断并复盘" : "통화 종료 및 리포트 보기"}
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

export default LiveCallMode;
