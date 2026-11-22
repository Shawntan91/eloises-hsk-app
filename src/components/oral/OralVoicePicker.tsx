"use client";

import React, { useState } from "react";
import { Volume2, Loader2 } from "lucide-react";
import {
  ORAL_VOICES,
  getOralVoiceName,
} from "@/lib/oral/oralVoices";
import { playOralTTS } from "@/lib/oral/audioClient";

interface OralVoicePickerProps {
  /** null = 跟随场景默认声音 */
  value: string | null;
  scenarioVoice: string;
  isZh: boolean;
  onChange: (voiceId: string | null) => void;
}

export const OralVoicePicker: React.FC<OralVoicePickerProps> = ({
  value,
  scenarioVoice,
  isZh,
  onChange,
}) => {
  const [previewing, setPreviewing] = useState(false);
  const effectiveVoice = value ?? scenarioVoice;

  const previewVoice = async (voiceId: string) => {
    if (previewing) return;
    setPreviewing(true);
    try {
      const name = getOralVoiceName(voiceId, true);
      await playOralTTS({
        text: `你好，我是${name}，很高兴见到你。`,
        voice: voiceId,
        rate: 1.0,
      });
    } catch {
      // 试听失败时静默处理（Edge TTS 偶发不可用）
    } finally {
      setPreviewing(false);
    }
  };

  const handleSelect = async (next: string) => {
    const target = next === "" ? null : next;
    onChange(target);
    await previewVoice(target ?? scenarioVoice);
  };

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-xs">
      <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
      <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
        {isZh ? "声音" : "목소리"}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => handleSelect(e.target.value)}
        className="min-h-[36px] max-w-[150px] sm:max-w-none px-2 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-800 outline-none cursor-pointer"
        aria-label={isZh ? "选择口语声音" : "회화 목소리 선택"}
      >
        <option value="">{isZh ? "场景默认" : "상황 기본값"}</option>
        {ORAL_VOICES.map((v) => (
          <option key={v.id} value={v.id}>
            {isZh ? v.nameZh : v.nameKo} ·{" "}
            {v.gender === "female"
              ? isZh
                ? "女"
                : "여"
              : isZh
                ? "男"
                : "남"}
          </option>
        ))}
      </select>
      <span className="text-[11px] text-slate-500 whitespace-nowrap hidden sm:inline">
        {value === null
          ? isZh
            ? `当前：${getOralVoiceName(scenarioVoice, true)}（场景默认）`
            : `현재: ${getOralVoiceName(scenarioVoice, false)} (상황 기본값)`
          : isZh
            ? `当前：${getOralVoiceName(value, true)}`
            : `현재: ${getOralVoiceName(value, false)}`}
      </span>
      <button
        type="button"
        onClick={() => previewVoice(effectiveVoice)}
        disabled={previewing}
        className="min-w-[36px] min-h-[36px] p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center justify-center transition"
        aria-label={isZh ? "试听当前声音" : "현재 목소리 미리 듣기"}
      >
        {previewing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default OralVoicePicker;
