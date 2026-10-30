"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/common/Header";
import hskExamsData from "@/data/hskExams.json";
import { Exam } from "@/types/exam";
import { Question } from "@/types/question";
import {
  saveActiveExam,
  loadExam,
  saveUserExamOptions,
  loadUserExamOptions,
  DEFAULT_USER_EXAM_OPTIONS,
  UserExamOptions,
  exportAllUserData,
  importUserData,
  restoreBackupSnapshot,
} from "@/utils/storage";
import { getStudyGoals, saveStudyGoals } from "@/utils/studyStats";
import { getLocale, Locale } from "@/utils/i18n";
import { getSectionRangeLabel } from "@/utils/timer";
import {
  Sliders,
  Clock,
  Play,
  Shuffle,
  Flag,
  RotateCcw,
  BookOpen,
  Headphones,
  FileEdit,
  Sparkles,
  Layers,
  ChevronLeft,
  CheckCircle2,
  Download,
  Upload,
  Database,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

function SettingsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examIdParam = searchParams.get("examId") || "hsk4-01";
  const partParam = searchParams.get("part") || "all"; // all, listening, reading, writing

  const [selectedExamId, setSelectedExamId] = useState<string>(examIdParam);
  const [selectedSection, setSelectedSection] = useState<"all" | "listening" | "reading" | "writing">(
    (partParam as any) || "all"
  );
  const [selectedCountOption, setSelectedCountOption] = useState<string>("all");
  const [customCount, setCustomCount] = useState<number>(10);
  const [durationOption, setDurationOption] = useState<number>(105); // minutes
  const [customDuration, setCustomDuration] = useState<number>(45);
  const [answerMode, setAnswerMode] = useState<"official" | "practice">("official");
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(false);
  const [rememberSettings, setRememberSettings] = useState<boolean>(true);
  const [locale, setLocale] = useState<Locale>("ko");
  const [targetExamDate, setTargetExamDate] = useState<string>("");
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const backupFileRef = React.useRef<HTMLInputElement>(null);

  const exams = hskExamsData as any[];
  const currentExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  useEffect(() => {
    setLocale(getLocale());
    const goals = getStudyGoals();
    setTargetExamDate(goals.targetExamDate);

    const saved = loadUserExamOptions();
    if (saved) {
      if (saved.selectedCountOption) setSelectedCountOption(saved.selectedCountOption);
      if (typeof saved.customCount === "number") setCustomCount(saved.customCount);
      if (typeof saved.selectedDurationOption === "number") setDurationOption(saved.selectedDurationOption);
      if (typeof saved.shuffleQuestions === "boolean") setShuffleQuestions(saved.shuffleQuestions);
      if (typeof saved.shuffleOptions === "boolean") setShuffleOptions(saved.shuffleOptions);
    }

    const handleLocaleChange = () => setLocale(getLocale());
    window.addEventListener("hsk-locale-changed", handleLocaleChange);
    return () => window.removeEventListener("hsk-locale-changed", handleLocaleChange);
  }, []);

  const isKo = locale !== "zh";

  // Calculate question count for current section filter
  const getSectionQuestions = (allQuestions: Question[], section: string) => {
    if (section === "listening") {
      return allQuestions.filter((q) => q.partCategory === "听力");
    }
    if (section === "reading") {
      return allQuestions.filter((q) => q.partCategory === "阅读");
    }
    if (section === "writing") {
      return allQuestions.filter((q) => q.partCategory === "书写");
    }
    return allQuestions;
  };

  const poolQuestions = getSectionQuestions(currentExam.questions, selectedSection);

  const handleStartExam = () => {
    let finalQuestions: Question[] = [...poolQuestions];

    // Shuffle questions if chosen
    if (shuffleQuestions) {
      finalQuestions.sort(() => 0.5 - Math.random());
    }

    // Limit count
    let count = finalQuestions.length;
    if (selectedCountOption !== "all") {
      const parsed = parseInt(selectedCountOption, 10);
      if (!isNaN(parsed) && parsed > 0) {
        count = Math.min(parsed, finalQuestions.length);
      } else if (selectedCountOption === "custom") {
        count = Math.min(customCount, finalQuestions.length);
      }
      finalQuestions = finalQuestions.slice(0, count);
    }

    // Group by section category (听力 -> 阅读 -> 书写) so sections in palette are always contiguous
    const catRank: Record<string, number> = { 听力: 1, 阅读: 2, 书写: 3 };
    finalQuestions.sort((a, b) => {
      const rA = catRank[a.partCategory || "阅读"] || 2;
      const rB = catRank[b.partCategory || "阅读"] || 2;
      if (rA !== rB) return rA - rB;
      return shuffleQuestions ? 0 : a.number - b.number;
    });

    // If question count is subsetted or shuffled, renumber 1..N so palette ranges match actual questions
    if (shuffleQuestions || selectedCountOption !== "all") {
      finalQuestions = finalQuestions.map((q, idx) => ({
        ...q,
        number: idx + 1,
      }));
    }

    // Shuffle options if chosen
    if (shuffleOptions) {
      finalQuestions = finalQuestions.map((q) => {
        if (!q.options || Object.keys(q.options).length <= 1) return q;
        const entries = Object.entries(q.options);
        const correctText = q.officialAnswer ? q.options[q.officialAnswer] : undefined;
        const shuffledValues = entries.map(([, v]) => v).sort(() => 0.5 - Math.random());
        const letters = ["A", "B", "C", "D", "E", "F"];
        const newOptions: Record<string, string | undefined> = {};
        let newAnswer = q.officialAnswer;
        shuffledValues.forEach((val, idx) => {
          const l = letters[idx] || String.fromCharCode(65 + idx);
          newOptions[l] = val;
          if (val && correctText && val === correctText) {
            newAnswer = l;
          }
        });
        return {
          ...q,
          options: newOptions,
          officialAnswer: newAnswer,
        };
      });
    }

    // Determine duration in seconds
    let durationSeconds = 105 * 60;
    if (durationOption === 0) {
      durationSeconds = 999999; // Unlimited / practice
    } else if (durationOption === -1) {
      durationSeconds = customDuration * 60;
    } else {
      durationSeconds = durationOption * 60;
    }

    const sectionZh =
      selectedSection === "all"
        ? "全卷模考"
        : selectedSection === "listening"
        ? "听力专项"
        : selectedSection === "reading"
        ? "阅读专项"
        : "书写专项";

    const sectionKo =
      selectedSection === "all"
        ? "전체 모의고사"
        : selectedSection === "listening"
        ? "듣기 집중 연습"
        : selectedSection === "reading"
        ? "독해 집중 연습"
        : "쓰기 집중 연습";

    const durationLabelZh =
      durationOption === 0 ? "不限时" : `${Math.round(durationSeconds / 60)}分钟`;
    const durationLabelKo =
      durationOption === 0 ? "시간 무제한" : `${Math.round(durationSeconds / 60)}분`;

    // Create unique customized active exam ID
    const activeExamId = `${currentExam.id}-custom-${Date.now()}`;
    const customExam: Exam = {
      id: activeExamId,
      level: currentExam.level,
      title: `${currentExam.title} (${sectionZh})`,
      titleKo: `${currentExam.titleKo || currentExam.title} (${sectionKo})`,
      subTitle: `${count}题 · ${durationLabelZh}`,
      subTitleKo: `${count}문항 · ${durationLabelKo}`,
      tag: currentExam.tag,
      tagKo: currentExam.tagKo,
      questions: finalQuestions,
      duration: durationSeconds,
      startTime: Date.now(),
      answers: {},
      markedQuestions: [],
      currentQuestion: 0,
      status: "in_progress",
      answerMode: answerMode,
      audioUrl: currentExam.audioUrl,
      audioFileName: currentExam.audioFileName,
    };

    saveActiveExam(customExam);

    if (rememberSettings) {
      saveUserExamOptions({
        selectedCountOption,
        customCount,
        selectedDurationOption: durationOption,
        customDuration,
        shuffleQuestions,
        shuffleOptions,
      });
    }

    router.push(`/exam/${activeExamId}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{isKo ? "메인 홈으로 돌아가기" : "返回首页"}</span>
          </Link>
          <span className="text-xs text-slate-400 font-medium">
            HSK Custom Exam Settings
          </span>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
          {/* Title Header */}
          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white">
                HSK {currentExam.level}급
              </span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                맞춤형 실전 모의고사 설정
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isKo ? "시험 전 맞춤형 환경설정" : "考前个性化刷题配置"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isKo
                ? "응시할 영역(듣기/독해/쓰기), 문항 수, 시험 시간, 문항 순서 셔플 등을 자유롭게 선택하여 시작하세요."
                : "支持按专项题型抽取、设定自定义倒计时、题目与选项乱序以及即时解析练习模式。"}
            </p>
          </div>

          {/* 1. Exam Paper Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2.5 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-red-600" />
              <span>{isKo ? "1. 응시할 기출 회차 선택" : "1. 选择考试试卷"}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {exams.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => setSelectedExamId(ex.id)}
                  className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                    selectedExamId === ex.id
                      ? "border-red-500 bg-red-50/40 ring-2 ring-red-500/20"
                      : "border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {isKo ? ex.titleKo : ex.title}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      HSK {ex.level}급 · 총 {ex.questions.length}문항
                    </span>
                  </div>
                  {selectedExamId === ex.id && (
                    <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Section Scope (Part) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2.5 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>{isKo ? "2. 응시 영역 선택" : "2. 考试范围与专项题型"}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  id: "all",
                  label: isKo
                    ? `전체 영역 (${currentExam.questions.length}문항)`
                    : `全卷模考 (${currentExam.questions.length}题)`,
                  icon: Layers,
                },
                {
                  id: "listening",
                  label: getSectionRangeLabel(currentExam.questions, "听力", locale),
                  icon: Headphones,
                },
                {
                  id: "reading",
                  label: getSectionRangeLabel(currentExam.questions, "阅读", locale),
                  icon: BookOpen,
                },
                {
                  id: "writing",
                  label: getSectionRangeLabel(currentExam.questions, "书写", locale),
                  icon: FileEdit,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = selectedSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedSection(item.id as any)}
                    className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                      isSelected
                        ? "border-red-500 bg-red-50/40 text-red-700 ring-2 ring-red-500/20"
                        : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Number of Questions */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2.5 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>
                {isKo ? "3. 풀이할 문항 수" : "3. 抽取题目数量"} (최대 {poolQuestions.length}문항)
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: isKo ? `전체 (${poolQuestions.length}문항)` : `全部 (${poolQuestions.length}题)` },
                { id: "10", label: isKo ? "10문항 빠른 풀이" : "10题精练" },
                { id: "20", label: isKo ? "20문항" : "20题" },
                { id: "30", label: isKo ? "30문항" : "30题" },
                { id: "custom", label: isKo ? "직접 입력" : "自定义题数" },
              ].map((cnt) => (
                <button
                  key={cnt.id}
                  type="button"
                  onClick={() => setSelectedCountOption(cnt.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                    selectedCountOption === cnt.id
                      ? "border-red-500 bg-red-50 text-red-700 shadow-xs"
                      : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white"
                  }`}
                >
                  {cnt.label}
                </button>
              ))}
            </div>
            {selectedCountOption === "custom" && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={poolQuestions.length}
                  value={customCount}
                  onChange={(e) => setCustomCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                />
                <span className="text-xs text-slate-500">
                  {isKo ? "문항을 무작위 추출하여 시험을 진행합니다" : "道题目"}
                </span>
              </div>
            )}
          </div>

          {/* 4. Timer & Duration */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2.5 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>{isKo ? "4. 시험 제한시간 / 倒计时设置" : "4. 考试时间与倒计时"}</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 105, label: isKo ? "공식 권장 (105분)" : "官方标准 (105分)" },
                { id: 60, label: isKo ? "60분" : "60分钟" },
                { id: 45, label: isKo ? "45분" : "45分钟" },
                { id: 30, label: isKo ? "30분" : "30分钟" },
                { id: 0, label: isKo ? "무제한 (자율 풀이)" : "不限时间 (纯练习)" },
              ].map((time) => (
                <button
                  key={time.id}
                  type="button"
                  onClick={() => setDurationOption(time.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                    durationOption === time.id
                      ? "border-red-500 bg-red-50 text-red-700 shadow-xs"
                      : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white"
                  }`}
                >
                  {time.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Exam Mode & Shuffling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            {/* Answer Mode */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                {isKo ? "풀이 모드" : "答题反馈模式"}
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setAnswerMode("official")}
                  className={`w-full p-3 rounded-2xl border text-left transition ${
                    answerMode === "official"
                      ? "border-red-500 bg-red-50/40 text-red-900 ring-1 ring-red-500"
                      : "border-slate-200 bg-slate-50/70 text-slate-700"
                  }`}
                >
                  <p className="text-xs font-bold">
                    {isKo ? "실전 모의고사 (Official CBT)" : "官方全真模考"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isKo
                      ? "정답 및 해설을 숨기고 실제 시험처럼 풀이 후 최종 제출하여 성적표 확인"
                      : "全真考场环境，交卷后统一生成报告与错题"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setAnswerMode("practice")}
                  className={`w-full p-3 rounded-2xl border text-left transition ${
                    answerMode === "practice"
                      ? "border-red-500 bg-red-50/40 text-red-900 ring-1 ring-red-500"
                      : "border-slate-200 bg-slate-50/70 text-slate-700"
                  }`}
                >
                  <p className="text-xs font-bold">
                    {isKo ? "학습 연습 모드 (Practice)" : "随做随看练习模式"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isKo
                      ? "한 문제 풀 때마다 즉시 정답과 한국어 해설을 확인하며 학습"
                      : "即时查看每题答案与深度解析"}
                  </p>
                </button>
              </div>
            </div>

            {/* Shuffling Options */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                {isKo ? "무작위 셔플 옵션" : "防作弊与乱序设置"}
              </label>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {isKo ? "문항 순서 랜덤 셔플" : "题目顺序随机打乱"}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {isKo ? "문제를 무작위 순서로 재배열합니다" : "打乱原有题号顺序"}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-slate-50/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {isKo ? "보기(A/B/C/D) 순서 셔플" : "选项顺序随机打乱"}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {isKo ? "선택지의 순서를 랜덤으로 바꿉니다" : "防止机械记忆选项位置"}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* 6. F1: Data Management & D-Day Settings */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>{isKo ? "6. 학습 데이터 백업 및 복원 (데이터 관리)" : "6. 全站学习数据备份与安全管理"}</span>
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                {isKo
                  ? "단어 암기 진도, 오답노트, 모의고사 응시 이력, 복습 스케줄을 JSON 파일로 백업하거나 다른 기기로 복원합니다."
                  : "支持将模考历史、单词进度、错题本与艾宾浩斯复习数据导出为 .json 文件，换设备时一键无缝恢复。"}
              </p>
            </div>

            {backupMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{backupMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Export Button */}
              <button
                type="button"
                onClick={() => {
                  const jsonStr = exportAllUserData();
                  const blob = new Blob([jsonStr], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Eloise_HSK_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setBackupMsg(isKo ? "백업 파일 다운로드가 완료되었습니다." : "全站备份数据导出成功！");
                  setTimeout(() => setBackupMsg(null), 3000);
                }}
                className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>{isKo ? "전체 데이터 백업 다운로드" : "导出完整备份 (.json)"}</span>
              </button>

              {/* Import Button */}
              <div>
                <input
                  ref={backupFileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const content = evt.target?.result as string;
                      const res = importUserData(content);
                      alert(res.message);
                      if (res.success) {
                        window.location.reload();
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => backupFileRef.current?.click()}
                  className="w-full p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span>{isKo ? "백업 파일로 복원 (업로드)" : "上传备份文件恢复"}</span>
                </button>
              </div>

              {/* Restore Snapshot */}
              <button
                type="button"
                onClick={() => {
                  if (confirm(isKo ? "직전 백업 스냅샷으로 복원하시겠습니까?" : "确定恢复到导入前的快照备份吗？")) {
                    const ok = restoreBackupSnapshot();
                    if (ok) {
                      alert(isKo ? "스냅샷 복원이 완료되었습니다." : "已恢复快照！");
                      window.location.reload();
                    } else {
                      alert(isKo ? "저장된 스냅샷이 없습니다." : "未找到可用快照");
                    }
                  }
                }}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>{isKo ? "직전 스냅샷 복구" : "撤销导入恢复快照"}</span>
              </button>
            </div>

            {/* Target Exam Date for D-Day */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-600" />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {isKo ? "목표 HSK 시험일 설정 (D-Day 카운트다운)" : "设定目标 HSK 考试日期 (D-Day 倒计时)"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isKo ? "홈 화면 상단에 D-Day 디데이 카드가 자동 노출됩니다" : "设定后将在首页显示备考倒计时大字看板"}
                  </span>
                </div>
              </div>
              <input
                type="date"
                value={targetExamDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setTargetExamDate(val);
                  const goals = getStudyGoals();
                  saveStudyGoals({ ...goals, targetExamDate: val });
                }}
                className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 bg-white"
              />
            </div>
          </div>

          {/* Submit & Remember Action Bar */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberSettings}
                onChange={(e) => setRememberSettings(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500"
              />
              <span>{isKo ? "이 맞춤형 설정을 다음 시험에도 기억하기" : "记住我的配置选项"}</span>
            </label>

            <button
              type="button"
              onClick={handleStartExam}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-sm shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition transform active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isKo ? "설정 적용 후 시험 시작하기" : "应用配置并开始考试"}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col bg-slate-50/50 min-h-screen">
          <Header />
          <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
            <div className="bg-white/95 rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-pulse">
              <div className="h-7 bg-slate-200 rounded-xl w-56" />
              <div className="h-4 bg-slate-100 rounded-lg w-80" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="h-16 bg-slate-100 rounded-2xl" />
                <div className="h-16 bg-slate-100 rounded-2xl" />
                <div className="h-16 bg-slate-100 rounded-2xl" />
                <div className="h-16 bg-slate-100 rounded-2xl" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="h-14 bg-slate-100 rounded-2xl" />
                <div className="h-14 bg-slate-100 rounded-2xl" />
                <div className="h-14 bg-slate-100 rounded-2xl" />
                <div className="h-14 bg-slate-100 rounded-2xl" />
              </div>
            </div>
          </main>
        </div>
      }
    >
      <SettingsForm />
    </Suspense>
  );
}
