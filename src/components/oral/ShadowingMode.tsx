"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  Play,
  Square,
  Repeat,
  Mic,
  Bookmark,
  BookmarkCheck,
  Eye,
  EyeOff,
  Gauge,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { OralScenario, OralScriptLine } from "@/types/oral";
import { oralStorage } from "@/lib/oral/storage";
import {
  detectSupportedAudioMime,
  playOralTTS,
  stopAllOralAudio,
  unlockAudioPlayback,
} from "@/lib/oral/audioClient";
import RubyText from "./RubyText";

interface ShadowingModeProps {
  scenario: OralScenario;
  isZh: boolean;
  /** 自选声音（null/undefined = 跟随场景默认声音，仅用于对方台词） */
  voiceOverride?: string | null;
}

export const ShadowingMode: React.FC<ShadowingModeProps> = ({
  scenario,
  isZh,
  voiceOverride,
}) => {
  const [speed, setSpeed] = useState<0.8 | 1.0>(1.0);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showKorean, setShowKorean] = useState(true);

  const [playingLineId, setPlayingLineId] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [loopLineId, setLoopLineId] = useState<string | null>(null);

  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  // Local self-check mic recording per line
  const [recordingLineId, setRecordingLineId] = useState<string | null>(null);
  const [recordedAudioMap, setRecordedAudioMap] = useState<Record<string, string>>({});
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopSequenceRef = useRef(false);
  const loopLineIdRef = useRef<string | null>(null);

  useEffect(() => {
    loopLineIdRef.current = loopLineId;
  }, [loopLineId]);

  useEffect(() => {
    const loadSaved = async () => {
      const phrases = await oralStorage.getPhrases();
      setSavedSet(new Set(phrases.map((p) => p.zh.trim())));
    };
    loadSaved();
    window.addEventListener("oral-phrasebook-changed", loadSaved);
    return () => {
      window.removeEventListener("oral-phrasebook-changed", loadSaved);
      stopSequenceRef.current = true;
      stopAllOralAudio();
    };
  }, []);

  const partnerVoice = voiceOverride ?? scenario.voiceName;

  const playSingleLine = async (line: OralScriptLine) => {
    unlockAudioPlayback();
    stopSequenceRef.current = true;
    setIsPlayingAll(false);

    const voice =
      line.speaker === "partner"
        ? partnerVoice
        : "zh-CN-XiaoxiaoNeural";

    setPlayingLineId(line.id);
    await playOralTTS({
      text: line.zh,
      voice,
      rate: speed,
    });
    setPlayingLineId(null);
  };

  const handleToggleLoop = async (line: OralScriptLine) => {
    unlockAudioPlayback();
    if (loopLineId === line.id) {
      setLoopLineId(null);
      loopLineIdRef.current = null;
      stopAllOralAudio();
      setPlayingLineId(null);
      return;
    }

    stopSequenceRef.current = true;
    setIsPlayingAll(false);
    setLoopLineId(line.id);
    loopLineIdRef.current = line.id;

    const voice =
      line.speaker === "partner"
        ? partnerVoice
        : "zh-CN-XiaoxiaoNeural";

    while (loopLineIdRef.current === line.id) {
      setPlayingLineId(line.id);
      await playOralTTS({
        text: line.zh,
        voice,
        rate: speed,
      });
      if (loopLineIdRef.current !== line.id) break;
      await new Promise((r) => setTimeout(r, 650));
    }
    setPlayingLineId(null);
  };

  const handlePlayAll = async () => {
    unlockAudioPlayback();
    if (isPlayingAll) {
      stopSequenceRef.current = true;
      setIsPlayingAll(false);
      setPlayingLineId(null);
      stopAllOralAudio();
      return;
    }

    setLoopLineId(null);
    loopLineIdRef.current = null;
    stopSequenceRef.current = false;
    setIsPlayingAll(true);

    for (const line of scenario.script) {
      if (stopSequenceRef.current) break;
      setPlayingLineId(line.id);
      const voice =
        line.speaker === "partner"
          ? partnerVoice
          : "zh-CN-XiaoxiaoNeural";
      await playOralTTS({
        text: line.zh,
        voice,
        rate: speed,
      });
      if (stopSequenceRef.current) break;
      await new Promise((r) => setTimeout(r, 450));
    }

    setPlayingLineId(null);
    setIsPlayingAll(false);
  };

  const handleToggleRecord = async (lineId: string) => {
    setMicError(null);
    if (recordingLineId === lineId) {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // ignore
      }
      setRecordingLineId(null);
      return;
    }

    // Stop any existing recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mimeType } = detectSupportedAudioMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setRecordedAudioMap((prev) => ({ ...prev, [lineId]: url }));
        }
        setRecordingLineId(null);
      };

      mediaRecorderRef.current = recorder;
      setRecordingLineId(lineId);
      recorder.start();
    } catch {
      setRecordingLineId(null);
      setMicError(
        isZh
          ? "无法访问麦克风，请检查浏览器录音权限。"
          : "마이크에 접근할 수 없습니다. 브라우저 권한을 확인해 주세요."
      );
    }
  };

  const handleSavePhrase = async (line: OralScriptLine) => {
    await oralStorage.savePhrase({
      zh: line.zh,
      pinyin: line.pinyin,
      ko: line.ko,
      noteKo: line.tipKo,
      scenarioId: scenario.id,
      scenarioTitleZh: scenario.titleZh,
      scenarioTitleKo: scenario.titleKo,
      source: "shadowing",
    });
  };

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePlayAll}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition select-none touch-manipulation ${
              isPlayingAll
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {isPlayingAll ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>{isZh ? "停止连播" : "연속 재생 정지"}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{isZh ? "一键连播全篇" : "전체 연속 듣기"}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1.0 ? 0.8 : 1.0))}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Gauge className="w-4 h-4 text-slate-600" />
            <span>{speed === 0.8 ? "0.8x 慢速" : "1.0x 常速"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPinyin((v) => !v)}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              showPinyin
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
          >
            {showPinyin ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isZh ? "拼音" : "병음"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowKorean((v) => !v)}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              showKorean
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
          >
            {showKorean ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isZh ? "韩语翻译" : "한국어 번역"}</span>
          </button>
        </div>
      </div>

      {micError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium px-4 py-2.5 rounded-xl">
          {micError}
        </div>
      )}

      {/* Dialogue Lines */}
      <div className="space-y-3">
        {scenario.script.map((line) => {
          const isPartner = line.speaker === "partner";
          const isPlaying = playingLineId === line.id;
          const isLooping = loopLineId === line.id;
          const isRecording = recordingLineId === line.id;
          const isSaved = savedSet.has(line.zh.trim());
          const recordedUrl = recordedAudioMap[line.id];

          return (
            <div
              key={line.id}
              className={`rounded-2xl border p-4 transition ${
                isPlaying
                  ? "bg-emerald-50/70 border-emerald-300 shadow-sm"
                  : isPartner
                  ? "bg-white border-slate-200"
                  : "bg-slate-50/80 border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isPartner
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isZh ? line.speakerLabelZh : line.speakerLabelKo}
                    </span>
                    {isPlaying && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {isZh ? "播放中..." : "재생 중..."}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => playSingleLine(line)}
                    className="text-left w-full group"
                  >
                    <div className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
                      <RubyText text={line.zh} showPinyin={showPinyin} />
                    </div>
                  </button>

                  {showKorean && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
                      {line.ko}
                    </p>
                  )}

                  {line.tipKo && (
                    <div className="mt-2.5 flex items-start gap-1.5 bg-amber-50/90 border border-amber-200/80 rounded-xl px-3 py-2 text-xs text-amber-900">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{line.tipKo}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => playSingleLine(line)}
                    className="min-w-[44px] min-h-[44px] p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition"
                    title={isZh ? "播放原声" : "원어민 발음 듣기"}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleLoop(line)}
                    className={`min-w-[44px] min-h-[44px] p-2 rounded-xl border flex items-center justify-center transition ${
                      isLooping
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                    title={isZh ? "单句循环" : "한 문장 반복"}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleRecord(line.id)}
                    className={`min-w-[44px] min-h-[44px] p-2 rounded-xl border flex items-center justify-center transition select-none touch-manipulation ${
                      isRecording
                        ? "bg-rose-600 text-white border-rose-600 animate-pulse"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                    title={isZh ? "跟读录音" : "따라 말하기 녹음"}
                  >
                    {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSavePhrase(line)}
                    className={`min-w-[44px] min-h-[44px] p-2 rounded-xl border flex items-center justify-center transition ${
                      isSaved
                        ? "bg-amber-100 text-amber-700 border-amber-300"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                    title={isZh ? "收藏表达" : "표현 저장"}
                  >
                    {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {recordedUrl && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-500 shrink-0">
                    {isZh ? "我的跟读回放：" : "내 녹음 듣기:"}
                  </span>
                  <audio src={recordedUrl} controls className="h-8 w-full max-w-xs" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ShadowingMode;
