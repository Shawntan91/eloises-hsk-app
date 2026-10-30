"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Award, RotateCcw, Sparkles } from "lucide-react";

interface ListeningShadowingProps {
  transcript: string;
}

export default function ListeningShadowing({ transcript }: ListeningShadowingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Split lines into non-empty sentences
  const lines = transcript
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const targetText = lines[selectedLineIndex] || transcript;

  useEffect(() => {
    // Reset state on target change
    setRecognizedText("");
    setScore(null);
    setErrorMsg(null);
  }, [selectedLineIndex, transcript]);

  const cleanChinese = (text: string) => {
    return text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "").toLowerCase();
  };

  const calculateScore = (target: string, spoken: string): number => {
    const cleanT = cleanChinese(target);
    const cleanS = cleanChinese(spoken);
    if (!cleanT || !cleanS) return 0;

    let matches = 0;
    const spokenChars = cleanS.split("");
    for (const char of cleanT) {
      const idx = spokenChars.indexOf(char);
      if (idx !== -1) {
        matches++;
        spokenChars.splice(idx, 1);
      }
    }

    const ratio = matches / Math.max(cleanT.length, cleanS.length);
    // Scale gently between 40 and 100 if there are matches
    if (matches === 0) return 30;
    return Math.min(100, Math.max(50, Math.round(ratio * 100)));
  };

  const handleStartRecording = () => {
    setErrorMsg(null);
    setRecognizedText("");
    setScore(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("현재 브라우저에서 음성 인식을 지원하지 않습니다. Chrome 브라우저를 권장합니다.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "zh-CN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript;
        setRecognizedText(spoken);
        const evalScore = calculateScore(targetText, spoken);
        setScore(evalScore);
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === "no-speech") {
          setErrorMsg("음성이 감지되지 않았습니다. 마이크에 대고 다시 말씀해 주세요.");
        } else {
          setErrorMsg(`음성 인식 오류: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      setIsRecording(false);
      setErrorMsg(e.message || "음성 인식을 시작할 수 없습니다.");
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const playTTS = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(cleanChinese(text));
      utter.lang = "zh-CN";
      utter.rate = 0.85;
      window.speechSynthesis.speak(utter);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
        <span className="flex items-center gap-1.5 text-purple-700">
          <Sparkles className="w-3.5 h-3.5" />
          <span>듣기 대본 따라 읽기 (Shadowing 발음 연습)</span>
        </span>
        {lines.length > 1 && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">문장 선택:</span>
            <select
              value={selectedLineIndex}
              onChange={(e) => setSelectedLineIndex(Number(e.target.value))}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5"
            >
              {lines.map((l, i) => (
                <option key={i} value={i}>
                  {i + 1}번째 줄 ({l.slice(0, 15)}...)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Target sentence display */}
      <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium text-slate-800 leading-snug">
          {targetText}
        </p>
        <button
          type="button"
          onClick={() => playTTS(targetText)}
          className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-100 transition shrink-0"
          title="원어민 표준 발음 듣기"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      {/* Recognition Controls & Result */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {isRecording ? (
          <button
            type="button"
            onClick={handleStopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold animate-pulse"
          >
            <MicOff className="w-3.5 h-3.5" />
            <span>녹음 중지 (말씀이 끝났습니다)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartRecording}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>🎤 마이크로 따라 읽기 (발음 평가)</span>
          </button>
        )}

        {score !== null && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white border border-slate-200 shadow-2xs">
            <Award
              className={`w-4 h-4 ${
                score >= 80 ? "text-emerald-500" : score >= 60 ? "text-amber-500" : "text-rose-500"
              }`}
            />
            <span>
              참고용 발음 점수:{" "}
              <strong
                className={
                  score >= 80
                    ? "text-emerald-600 font-mono"
                    : score >= 60
                    ? "text-amber-600 font-mono"
                    : "text-rose-600 font-mono"
                }
              >
                {score}점
              </strong>
            </span>
          </div>
        )}
      </div>

      {recognizedText && (
        <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
          <span className="font-bold text-slate-700">인식된 발음: </span>
          <span className="font-sans text-slate-900">{recognizedText}</span>
        </div>
      )}

      {errorMsg && (
        <p className="mt-1.5 text-[11px] text-rose-500 font-medium">{errorMsg}</p>
      )}
    </div>
  );
}
