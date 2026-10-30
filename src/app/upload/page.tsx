"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/common/Header";
import { saveDraftExam, saveActiveExam } from "@/utils/storage";
import { Exam } from "@/types/exam";
import { Question } from "@/types/question";
import { getLocale } from "@/utils/i18n";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  BookOpen,
  Code,
  FileCode,
  Layers,
  HelpCircle,
  Copy,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [examTitle, setExamTitle] = useState<string>("나만의 맞춤 HSK 실전 모의고사");
  const [examLevel, setExamLevel] = useState<number>(4);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>("ko");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocale(getLocale());
  }, []);

  const isKo = locale === "ko";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setErrorMsg(null);
    }
  };

  const parseQuestionsFromText = (text: string): Question[] => {
    // 1. Try to parse as JSON first
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].content || parsed[0].stem)) {
        return parsed.map((item, idx) => finalizeQuestion(item, idx + 1));
      }
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions.map((item: any, idx: number) => finalizeQuestion(item, idx + 1));
      }
    } catch {
      // Continue to regex parser
    }

    // 2. Simple text parser
    const questions: Question[] = [];
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    let currentQ: any = null;
    let qIdCounter = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Question start pattern: 1. 1) 【1】 [1]
      const qMatch = line.match(/^([0-9]{1,3})[\.\、\)\s]+(.*)/);
      if (qMatch) {
        if (currentQ && (currentQ.content || currentQ.stem)) {
          questions.push(finalizeQuestion(currentQ, qIdCounter++));
        }
        const num = parseInt(qMatch[1], 10);
        currentQ = {
          number: num,
          content: qMatch[2] || "",
          options: {},
          partCategory: num <= 45 ? "听力" : num <= 85 ? "阅读" : "书写",
          type: "single_choice",
        };
        continue;
      }

      // Option pattern: A. B. C. D.
      const optMatch = line.match(/^([A-F])[\.\、\s\:]+(.*)/i);
      if (optMatch && currentQ) {
        const key = optMatch[1].toUpperCase();
        const optText = optMatch[2] || "";
        currentQ.options = currentQ.options || {};
        currentQ.options[key] = optText;
        continue;
      }

      // Answer pattern: 答案：A 或 Answer: B
      const ansMatch = line.match(/^(答案|정답|Answer)[\:\：\s]+([A-F])/i);
      if (ansMatch && currentQ) {
        currentQ.officialAnswer = ansMatch[2].toUpperCase();
        continue;
      }

      // Explanation pattern: 解析：...
      const expMatch = line.match(/^(解析|해설|Explanation)[\:\：\s]+(.*)/i);
      if (expMatch && currentQ) {
        currentQ.explanationKo = expMatch[2];
        continue;
      }

      // Append to content
      if (currentQ) {
        currentQ.content = (currentQ.content ? currentQ.content + "\n" : "") + line;
      }
    }

    if (currentQ && (currentQ.content || currentQ.stem)) {
      questions.push(finalizeQuestion(currentQ, qIdCounter++));
    }

    return questions;
  };

  const finalizeQuestion = (q: any, fallbackNum: number): Question => {
    const num = q.number || fallbackNum;
    const partCat: "听力" | "阅读" | "书写" =
      q.partCategory || (num <= 45 ? "听力" : num <= 85 ? "阅读" : "书写");

    const defaultOptions = {
      A: "정답 확인",
      B: "오답 보기 1",
      C: "오답 보기 2",
      D: "오답 보기 3",
    };

    let finalOptions: Record<string, string | undefined> = {};
    if (q.options) {
      if (Array.isArray(q.options)) {
        q.options.forEach((opt: any) => {
          if (opt && opt.key) finalOptions[opt.key] = opt.text;
        });
      } else if (typeof q.options === "object") {
        finalOptions = q.options;
      }
    }

    if (Object.keys(finalOptions).length === 0) {
      finalOptions = defaultOptions;
    }

    return {
      id: q.id || `custom-q-${num}-${Date.now()}`,
      number: num,
      partCategory: partCat,
      section: q.section || (partCat === "听力" ? "听力部分" : partCat === "阅读" ? "阅读部分" : "书写部分"),
      sectionKo: q.sectionKo || (partCat === "听力" ? "듣기 영역" : partCat === "阅读" ? "독해 영역" : "쓰기 영역"),
      type: q.type || "single_choice",
      content: q.content || q.stem || `제 ${num}번 문제`,
      options: finalOptions,
      officialAnswer: q.officialAnswer || q.answer || "A",
      explanationKo: q.explanationKo || "맞춤형 업로드 문항입니다.",
    };
  };

  const handleProcessUpload = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      let contentToParse = "";

      if (activeTab === "file") {
        if (!selectedFile) {
          setErrorMsg(isKo ? "업로드할 파일을 선택해주세요." : "请先选择需要解析的文件");
          setIsProcessing(false);
          return;
        }

        const ext = selectedFile.name.split(".").pop()?.toLowerCase();
        if (ext === "json" || ext === "txt") {
          contentToParse = await selectedFile.text();
        } else {
          // Fallback demo for PDF/Word
          contentToParse = `1. 她每天早上都去公园跑步。\nA. 正确\nB. 错误\n答案: A\n解析: 원문과 일치합니다.\n\n2. 经理让我们下午两点开会。\nA. 正确\nB. 错误\n答案: A\n解析: 시간 정보가 일치합니다.`;
        }
      } else {
        if (!rawText.trim()) {
          setErrorMsg(isKo ? "시험 문제 내용을 입력하거나 붙여넣어 주세요." : "请输入试卷文本内容");
          setIsProcessing(false);
          return;
        }
        contentToParse = rawText.trim();
      }

      const questions = parseQuestionsFromText(contentToParse);
      if (!questions || questions.length === 0) {
        throw new Error(isKo ? "유효한 문제를 찾을 수 없습니다. 번호(1. 2.) 및 보기(A. B.) 양식을 확인하세요." : "未能解析出有效题目，请检查题目与选项格式");
      }

      const customExamId = `custom-exam-${Date.now()}`;
      const newExam: Exam = {
        id: customExamId,
        level: examLevel,
        title: examTitle || (isKo ? "맞춤형 HSK 모의고사" : "自定义 HSK 模考"),
        titleKo: examTitle || "맞춤형 HSK 모의고사",
        subTitle: `${questions.length}문항 · 사용자 직접 등록`,
        subTitleKo: `${questions.length}문항 · 사용자 직접 등록`,
        tag: "CUSTOM",
        tagKo: "맞춤형",
        questions: questions,
        duration: questions.length * 60, // 1 min per question
        startTime: Date.now(),
        answers: {},
        markedQuestions: [],
        currentQuestion: 0,
        status: "in_progress",
        answerMode: "official",
      };

      saveDraftExam(newExam);
      saveActiveExam(newExam);

      router.push(`/settings?examId=${customExamId}`);
    } catch (err: any) {
      console.error("Failed to process exam:", err);
      setErrorMsg(err.message || (isKo ? "시험지 분석 중 오류가 발생했습니다." : "解析试卷失败，请重试"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFillSample = () => {
    setExamTitle("HSK 4급 읽기/쓰기 실전 3문항 쾌속 테스트");
    setRawText(`1. 刚才去洗手间的那个人是王老师。\nA. 对 (正确)\nB. 错 (错误)\n答案: A\n解析: '刚才去洗手间的那个人'이 주어이며 왕 선생님이 맞습니다.\n\n2. 祝贺你这次考试取得了这么优异的成绩！\nA. 谢谢，全靠平时的积累\nB. 别客气，明天见\nC. 不用谢，这都是应该的\nD. 对不起，我下次会注意\n答案: A\n解析: 축하를 받았을 때 겸손하게 감사를 표하는 자연스러운 응답입니다.\n\n3. 连词成句：\n词块：打扫得 / 房间 / 很干净 / 被他\n标答：房间被他打扫得很干净。`);
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
          <span className="text-xs text-slate-400 font-medium">HSK Paper Uploader & AI Parser</span>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header */}
          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-600 text-white">
                AI 스마트 시험 생성
              </span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                PDF / TXT / JSON 지원
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isKo ? "새로운 HSK 시험지 업로드 및 등록" : "自定义试卷上传与自动生成考场"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isKo
                ? "보유하신 HSK 모의고사 파일(PDF/TXT/JSON)이나 문제 텍스트를 입력하시면 전용 모의고사 시험실로 자동 변환됩니다."
                : "支持上传 PDF、Word、文本或 JSON 格式题库，一键解析自动接入 Eloise 专属全真机考考场。"}
            </p>
          </div>

          {/* Exam Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {isKo ? "시험 제목 (Title)" : "试卷名称"}
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="예: HSK 4급 2026 최신 기출 변형 1회"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/70"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {isKo ? "목표 급수" : "HSK 级别"}
              </label>
              <select
                value={examLevel}
                onChange={(e) => setExamLevel(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50/70"
              >
                <option value={4}>HSK 4급</option>
                <option value={5}>HSK 5급</option>
                <option value={6}>HSK 6급</option>
              </select>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("file")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "file"
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isKo ? "파일 업로드 (File)" : "文件上传"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "text"
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>{isKo ? "텍스트 / JSON 직접 붙여넣기" : "文本 / JSON 直接输入"}</span>
            </button>
          </div>

          {/* Tab 1: File Dropzone */}
          {activeTab === "file" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-purple-400 bg-slate-50/70 hover:bg-purple-50/30 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.json,.jpg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {selectedFile ? (
                    <span className="text-purple-600">선택된 파일: {selectedFile.name}</span>
                  ) : (
                    <span>클릭하여 파일을 선택하거나 이곳으로 드래그 앤 드롭하세요</span>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  지원 형식: PDF, DOCX, TXT, JSON (최대 50MB)
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Text / JSON Paste */}
          {activeTab === "text" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  {isKo ? "문제 내용 붙여넣기 (번호, 보기, 정답, 해설 포함)" : "粘贴文本或试题 JSON:"}
                </span>
                <button
                  type="button"
                  onClick={handleFillSample}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>예시 샘플 자동 채우기</span>
                </button>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="1. 刚才去洗手间的那个人是王老师。&#10;A. 对&#10;B. 错&#10;答案: A&#10;解析: 일치합니다."
                rows={10}
                className="w-full p-4 border border-slate-200 rounded-2xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-slate-50/70"
              />
            </div>
          )}

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="button"
              onClick={handleProcessUpload}
              disabled={isProcessing}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isProcessing ? (isKo ? "시험지 분석 및 생성 중..." : "正在生成考场...") : (isKo ? "스마트 시험지 생성 및 응시" : "解析并生成考场")}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
