"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Send,
  Keyboard,
  Volume2,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  Trophy,
  AlertCircle,
} from "lucide-react";
import {
  OralScenario,
  OralChatMessage,
  OralChatResponse,
} from "@/types/oral";
import { oralStorage } from "@/lib/oral/storage";
import {
  detectSupportedAudioMime,
  playOralTTS,
  stopAllOralAudio,
  unlockAudioPlayback,
} from "@/lib/oral/audioClient";
import { recordStudyTime } from "@/utils/studyStats";
import { logActivity } from "@/utils/activityLogger";
import RubyText from "./RubyText";

interface RoleplayModeProps {
  scenario: OralScenario;
  isZh: boolean;
}

export const RoleplayMode: React.FC<RoleplayModeProps> = ({
  scenario,
  isZh,
}) => {
  const [messages, setMessages] = useState<OralChatMessage[]>([
    {
      id: "opening",
      role: "assistant",
      textZh: scenario.openingZh,
      textKo: scenario.openingKo,
      timestamp: Date.now(),
    },
  ]);

  const [completedGoalIds, setCompletedGoalIds] = useState<string[]>([]);
  const [isMissionComplete, setIsMissionComplete] = useState(false);
  const [nextHintKo, setNextHintKo] = useState<string>("");

  const [showPinyin, setShowPinyin] = useState(true);
  const [showKorean, setShowKorean] = useState(true);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [textInput, setTextInput] = useState("");
  const [showHints, setShowHints] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingRetryText, setPendingRetryText] = useState<string | null>(null);

  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [blockedMsgId, setBlockedMsgId] = useState<string | null>(null);
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState<Set<string>>(
    new Set()
  );
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const loggedCompletionRef = useRef<boolean>(false);

  useEffect(() => {
    const loadSaved = async () => {
      const phrases = await oralStorage.getPhrases();
      setSavedSet(new Set(phrases.map((p) => p.zh.trim())));
    };
    loadSaved();
    window.addEventListener("oral-phrasebook-changed", loadSaved);
    return () => {
      window.removeEventListener("oral-phrasebook-changed", loadSaved);
      stopAllOralAudio();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handlePlayMessage = async (
    msgId: string,
    text: string,
    rate: number = 1.0
  ) => {
    unlockAudioPlayback();
    setBlockedMsgId(null);
    setPlayingMsgId(msgId);
    const res = await playOralTTS({
      text,
      voice: scenario.voiceName,
      rate,
    });
    setPlayingMsgId(null);
    if (res.status === "blocked") {
      setBlockedMsgId(msgId);
    }
  };

  const sendUserText = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isProcessing) return;

    setErrorMsg(null);
    setPendingRetryText(null);
    setIsProcessing(true);
    setStatusLabel(isZh ? "AI 正在回复..." : "AI가 답변을 생성 중이에요...");

    const userMsgId = `user_${Date.now()}`;
    const userMsg: OralChatMessage = {
      id: userMsgId,
      role: "user",
      textZh: trimmed,
      timestamp: Date.now(),
    };

    const historyForApi = messages.map((m) => ({
      role: m.role,
      text: m.textZh,
    }));

    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/oral/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          history: historyForApi,
          userMessage: trimmed,
          completedGoalIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Chat request failed");
      }

      const chatRes = data as OralChatResponse;
      const assistantId = `ai_${Date.now()}`;
      const assistantMsg: OralChatMessage = {
        id: assistantId,
        role: "assistant",
        textZh: chatRes.replyZh,
        textKo: chatRes.replyKo,
        feedback: chatRes.feedback,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (chatRes.feedback) {
        setExpandedFeedbackIds((prev) => new Set(prev).add(assistantId));
      }

      const nextGoals = Array.isArray(chatRes.completedGoalIds)
        ? chatRes.completedGoalIds
        : completedGoalIds;
      setCompletedGoalIds(nextGoals);
      setNextHintKo(chatRes.nextHintKo || "");

      const complete =
        Boolean(chatRes.isMissionComplete) ||
        nextGoals.length >= scenario.goals.length;
      setIsMissionComplete(complete);

      await oralStorage.saveScenarioProgress(scenario.id, nextGoals, complete);

      if (complete && !loggedCompletionRef.current) {
        loggedCompletionRef.current = true;
        const elapsedMin = Math.max(
          1,
          Math.round((Date.now() - sessionStartRef.current) / 60000)
        );
        recordStudyTime(elapsedMin);
        logActivity({
          type: "shadowing",
          durationSec: Math.max(30, Math.round((Date.now() - sessionStartRef.current) / 1000)),
          meta: {
            module: "oral_roleplay",
            scenarioId: scenario.id,
            scenarioTitle: scenario.titleZh,
          },
        });
      }

      // Auto-play AI reply TTS
      setIsProcessing(false);
      setStatusLabel(null);
      setPlayingMsgId(assistantId);
      const ttsRes = await playOralTTS({
        text: chatRes.replyZh,
        voice: scenario.voiceName,
        rate: 1.0,
      });
      setPlayingMsgId(null);
      if (ttsRes.status === "blocked") {
        setBlockedMsgId(assistantId);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isZh
          ? "发送失败，请重试。"
          : "전송에 실패했습니다. 다시 시도해 주세요.";
      // Roll back optimistic user bubble and let user retry with 1 click
      setMessages((prev) => prev.filter((m) => m.id !== userMsgId));
      setPendingRetryText(trimmed);
      setErrorMsg(msg);
      setIsProcessing(false);
      setStatusLabel(null);
    }
  };

  const handleToggleVoiceRecord = async () => {
    unlockAudioPlayback();
    setErrorMsg(null);

    if (isRecording) {
      // Stop recording and send to STT
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        setIsRecording(false);
      }
      return;
    }

    if (isProcessing) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mimeType, ext } = detectSupportedAudioMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);

        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });

        if (blob.size < 400) {
          setErrorMsg(
            isZh
              ? "录音太短啦，请再说一次。"
              : "녹음이 너무 짧아요. 다시 한 번 말씀해 주세요."
          );
          return;
        }

        setIsProcessing(true);
        setStatusLabel(isZh ? "正在识别语音..." : "음성을 인식하고 있어요...");

        try {
          const formData = new FormData();
          formData.append("file", blob, `speech.${ext}`);

          const sttRes = await fetch("/api/oral/stt", {
            method: "POST",
            body: formData,
          });
          const sttData = await sttRes.json();
          if (!sttRes.ok) {
            throw new Error(sttData.message || "STT failed");
          }

          const transcript = (sttData.text || "").trim();
          if (!transcript) {
            setErrorMsg(
              isZh
                ? "没有听清，请靠近麦克风再试一次，或切换打字输入。"
                : "잘 들리지 않았어요. 다시 말하거나 키보드 입력을 이용해 주세요."
            );
            setIsProcessing(false);
            setStatusLabel(null);
            return;
          }

          setIsProcessing(false);
          setStatusLabel(null);
          await sendUserText(transcript);
        } catch (err: unknown) {
          const msg =
            err instanceof Error
              ? err.message
              : isZh
              ? "语音识别失败，请重试。"
              : "음성 인식에 실패했습니다.";
          setErrorMsg(msg);
          setIsProcessing(false);
          setStatusLabel(null);
        }
      };

      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      recorder.start();
    } catch {
      setIsRecording(false);
      setErrorMsg(
        isZh
          ? "无法打开麦克风，请允许录音权限或切换键盘输入。"
          : "마이크 권한이 필요합니다. 권한을 허용하거나 키보드 입력을 사용해 주세요."
      );
    }
  };

  const handleSendTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    unlockAudioPlayback();
    if (!textInput.trim() || isProcessing) return;
    const val = textInput;
    setTextInput("");
    await sendUserText(val);
  };

  const handleReset = () => {
    stopAllOralAudio();
    setMessages([
      {
        id: `opening_${Date.now()}`,
        role: "assistant",
        textZh: scenario.openingZh,
        textKo: scenario.openingKo,
        timestamp: Date.now(),
      },
    ]);
    setCompletedGoalIds([]);
    setIsMissionComplete(false);
    setNextHintKo("");
    setErrorMsg(null);
    setBlockedMsgId(null);
    loggedCompletionRef.current = false;
    sessionStartRef.current = Date.now();
  };

  const handleSavePhrase = async (
    zh: string,
    ko: string,
    source: "roleplay" | "feedback",
    noteKo?: string
  ) => {
    await oralStorage.savePhrase({
      zh,
      ko,
      noteKo,
      scenarioId: scenario.id,
      scenarioTitleZh: scenario.titleZh,
      scenarioTitleKo: scenario.titleKo,
      source,
    });
  };

  const toggleFeedback = (id: string) => {
    setExpandedFeedbackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const progressPct = Math.round(
    (completedGoalIds.length / Math.max(1, scenario.goals.length)) * 100
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-230px)] min-h-[500px] bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Mission Progress Bar */}
      <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-800">
              {isZh ? "🎯 沟通目标进度" : "🎯 미션 달성 현황"}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              {completedGoalIds.length} / {scenario.goals.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowPinyin((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                showPinyin
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              {showPinyin ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{isZh ? "拼音" : "병음"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowKorean((v) => !v)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                showKorean
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              {showKorean ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span>{isZh ? "韩译" : "번역"}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-500"
              title={isZh ? "重新开始" : "다시 시작"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {scenario.goals.map((g) => {
            const done = completedGoalIds.includes(g.id);
            return (
              <div
                key={g.id}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                  done
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 line-through decoration-emerald-400"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-3 h-3 text-slate-300 shrink-0" />
                )}
                <span>{isZh ? g.zh : g.ko}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const isPlaying = playingMsgId === msg.id;
          const isBlocked = blockedMsgId === msg.id;
          const isSaved = savedSet.has(msg.textZh.trim());
          const feedbackOpen = expandedFeedbackIds.has(msg.id);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isUser ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 shadow-xs ${
                  isUser
                    ? "bg-emerald-600 text-white rounded-br-md"
                    : "bg-white border border-slate-200 text-slate-900 rounded-bl-md"
                }`}
              >
                <div className="text-sm sm:text-base font-semibold">
                  {isUser ? (
                    <span>{msg.textZh}</span>
                  ) : (
                    <RubyText text={msg.textZh} showPinyin={showPinyin} />
                  )}
                </div>

                {!isUser && showKorean && msg.textKo && (
                  <p className="text-xs text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
                    {msg.textKo}
                  </p>
                )}

                {!isUser && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <button
                      type="button"
                      onClick={() => handlePlayMessage(msg.id, msg.textZh, 1.0)}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                        isBlocked
                          ? "bg-amber-500 text-white animate-pulse shadow-sm"
                          : isPlaying
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>
                        {isBlocked
                          ? isZh
                            ? "点击播放"
                            : "눌러서 듣기"
                          : "1.0x"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePlayMessage(msg.id, msg.textZh, 0.8)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                    >
                      0.8x
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSavePhrase(
                          msg.textZh,
                          msg.textKo || "",
                          "roleplay"
                        )
                      }
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                        isSaved
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                      <span>{isSaved ? (isZh ? "已收藏" : "저장됨") : isZh ? "收藏" : "저장"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Collapsible Natural Expression Feedback Card */}
              {!isUser && msg.feedback && (
                <div className="max-w-[88%] sm:max-w-[78%] mt-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => toggleFeedback(msg.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-bold transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>💡 더 자연스러운 표현 ({isZh ? "更地道的说法" : "자연스러운 중국어"})</span>
                    </span>
                    {feedbackOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>

                  {feedbackOpen && (
                    <div className="mt-1 p-3 rounded-xl bg-white border border-amber-200 text-xs space-y-2 shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {isZh ? "你刚才说的" : "방금 한 말"}
                        </span>
                        <p className="text-slate-600 line-through">
                          {msg.feedback.userSaid}
                        </p>
                      </div>
                      <div className="flex items-start justify-between gap-2 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/70">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase">
                            {isZh ? "地道中文表达" : "중국인 실전 표현"}
                          </span>
                          <p className="text-sm font-bold text-emerald-950 mt-0.5">
                            <RubyText
                              text={msg.feedback.naturalZh}
                              showPinyin={showPinyin}
                            />
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handlePlayMessage(
                                `${msg.id}_fb`,
                                msg.feedback!.naturalZh,
                                0.95
                              )
                            }
                            className="p-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleSavePhrase(
                                msg.feedback!.naturalZh,
                                msg.feedback!.explanationKo,
                                "feedback"
                              )
                            }
                            className="p-1.5 rounded-lg bg-white border border-emerald-200 text-amber-600 hover:bg-amber-50"
                          >
                            {savedSet.has(msg.feedback.naturalZh.trim()) ? (
                              <BookmarkCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Bookmark className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        {msg.feedback.explanationKo}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>{statusLabel || (isZh ? "处理中..." : "처리 중...")}</span>
          </div>
        )}

        {/* Mission Complete Celebration Card */}
        {isMissionComplete && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-emerald-950">
                  {isZh
                    ? "🎉 太棒了！本场景沟通目标全部达成！"
                    : "🎉 축하해요! 이번 상황 미션을 모두 완료했어요!"}
                </h4>
                <p className="text-xs text-emerald-700">
                  {isZh
                    ? "已自动记录今日口语学习打卡。可以继续自由聊天，或收藏下方实用句："
                    : "오늘의 회화 학습 기록이 저장되었어요. 아래 유용한 표현도 저장해 보세요:"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scenario.quickHints.map((h, i) => {
                const saved = savedSet.has(h.zh.trim());
                return (
                  <div
                    key={i}
                    className="bg-white rounded-xl p-2.5 border border-emerald-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {h.zh}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {h.ko}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleSavePhrase(h.zh, h.ko, "roleplay")
                      }
                      className={`p-1.5 rounded-lg shrink-0 ${
                        saved
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {saved ? (
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Hints Drawer */}
      {showHints && (
        <div className="px-4 py-2.5 bg-amber-50/90 border-t border-amber-200 space-y-2 shrink-0">
          {nextHintKo && (
            <p className="text-xs font-bold text-amber-900">
              💬 {isZh ? "下一句思路：" : "다음 말 힌트:"} {nextHintKo}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {scenario.quickHints.map((h, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  unlockAudioPlayback();
                  setShowHints(false);
                  sendUserText(h.zh);
                }}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-200 text-left transition"
              >
                <span className="block text-xs font-bold text-slate-900">
                  {h.zh}
                </span>
                <span className="block text-[10px] text-slate-500">{h.ko}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{errorMsg}</span>
          </div>
          {pendingRetryText && (
            <button
              type="button"
              onClick={() => {
                unlockAudioPlayback();
                sendUserText(pendingRetryText);
              }}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shrink-0 transition"
            >
              {isZh ? "点击重试" : "다시 보내기"}
            </button>
          )}
        </div>
      )}

      {/* Bottom Input Area (Safe-area aware) */}
      <div
        className="px-3 sm:px-4 py-3 bg-white border-t border-slate-200 shrink-0"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center gap-2">
          {/* Hint Toggle */}
          <button
            type="button"
            onClick={() => setShowHints((v) => !v)}
            className={`min-w-[44px] min-h-[48px] px-3 rounded-2xl border flex items-center justify-center gap-1 text-xs font-bold transition shrink-0 ${
              showHints
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
            }`}
            title={isZh ? "卡壳提示" : "말문이 막힐 때 힌트"}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isZh ? "提示" : "힌트"}
            </span>
          </button>

          {/* Voice vs Text Input */}
          {inputMode === "voice" ? (
            <button
              type="button"
              onClick={handleToggleVoiceRecord}
              disabled={isProcessing}
              className={`flex-1 min-h-[48px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition select-none touch-manipulation ${
                isRecording
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md animate-pulse"
                  : "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm"
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>
                    {isZh
                      ? "正在听你说... 点击结束并发送"
                      : "듣고 있어요... 눌러서 전송하기"}
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>
                    {isZh
                      ? "点一下开始说（支持中韩混说）"
                      : "눌러서 말하기 (한국어 섞어도 OK)"}
                  </span>
                </>
              )}
            </button>
          ) : (
            <form
              onSubmit={handleSendTextSubmit}
              className="flex-1 flex items-center gap-2"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={
                  isZh
                    ? "输入中文（卡壳也可夹杂韩语）..."
                    : "중국어로 입력 (모르면 한국어 섞어도 돼요)..."
                }
                className="flex-1 min-h-[48px] px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={isProcessing || !textInput.trim()}
                className="min-w-[48px] min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center justify-center transition shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Mode Switcher */}
          <button
            type="button"
            onClick={() =>
              setInputMode((m) => (m === "voice" ? "text" : "voice"))
            }
            className="min-w-[44px] min-h-[48px] px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 flex items-center justify-center transition shrink-0"
            title={
              inputMode === "voice"
                ? isZh
                  ? "切换键盘输入"
                  : "키보드 입력으로 전환"
                : isZh
                ? "切换语音输入"
                : "음성 입력으로 전환"
            }
          >
            {inputMode === "voice" ? (
              <Keyboard className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleplayMode;
