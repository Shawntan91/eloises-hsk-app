"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Exam } from "@/types/exam";
import { loadExam, saveActiveExam, saveExamResult } from "@/utils/storage";
import { calculateExamResult } from "@/services/scoringService";
import { getLocale, Locale } from "@/utils/i18n";
import HskCbtExamLayout from "@/components/exam/HskCbtExamLayout";
import IeltsExamLayout from "@/components/exam/ielts/IeltsExamLayout";
import { loadExamById } from "@/services/examService";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ExamRoomPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params?.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"hsk" | "ielts">("hsk");
  const [locale, setLocale] = useState<Locale>("ko");

  const examRef = useRef<Exam | null>(null);
  examRef.current = exam;

  useEffect(() => {
    setLocale(getLocale());

    if (!examId) return;

    const initExam = async () => {
      // 1. Try to load active exam from storage
      let active = loadExam(examId);

      // 2. If not found in storage, load from built-in data
      if (!active) {
        const found = await loadExamById(examId);
        if (found) {
          active = {
            id: found.id,
            level: found.level,
            title: found.title,
            titleKo: found.titleKo,
            subTitle: found.subTitle,
            subTitleKo: found.subTitleKo,
            tag: found.tag,
            tagKo: found.tagKo,
            questions: found.questions,
            duration: found.duration || (found as any).durationMinutes * 60,
            startTime: Date.now(),
            answers: {},
            markedQuestions: [],
            currentQuestion: 0,
            status: "in_progress",
            answerMode: "official",
            audioUrl: found.audioUrl,
            audioFileName: found.audioFileName,
          };
          saveActiveExam(active);
        }
      }

      if (!active) {
        router.replace("/");
        return;
      }

      if (active.status === "submitted") {
        router.replace(`/result/${examId}`);
        return;
      }

      setExam(active);
      setCurrentIndex(active.currentQuestion || 0);
    };

    initExam();
  }, [examId, router]);

  // Handle select answer
  const handleSelectAnswer = useCallback(
    (ans: string) => {
      if (!exam) return;
      const currentQ = exam.questions[currentIndex];
      if (!currentQ) return;

      const nextAnswers = { ...exam.answers };
      if (!ans) {
        delete nextAnswers[currentQ.id];
      } else {
        nextAnswers[currentQ.id] = ans;
      }

      const updated: Exam = {
        ...exam,
        answers: nextAnswers,
        currentQuestion: currentIndex,
      };

      setExam(updated);
      saveActiveExam(updated);
    },
    [exam, currentIndex]
  );

  // Handle toggle mark
  const handleToggleMark = useCallback(() => {
    if (!exam) return;
    const currentQ = exam.questions[currentIndex];
    if (!currentQ) return;

    const isMarked = exam.markedQuestions.includes(currentQ.id);
    const nextMarked = isMarked
      ? exam.markedQuestions.filter((id) => id !== currentQ.id)
      : [...exam.markedQuestions, currentQ.id];

    const updated: Exam = {
      ...exam,
      markedQuestions: nextMarked,
    };

    setExam(updated);
    saveActiveExam(updated);
  }, [exam, currentIndex]);

  // Jump to question
  const handleSelectQuestionIndex = useCallback(
    (idx: number) => {
      if (!exam) return;
      setCurrentIndex(idx);
      const updated: Exam = {
        ...exam,
        currentQuestion: idx,
      };
      setExam(updated);
      saveActiveExam(updated);
    },
    [exam]
  );

  const handleNext = () => {
    if (!exam) return;
    if (currentIndex < exam.questions.length - 1) {
      handleSelectQuestionIndex(currentIndex + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      handleSelectQuestionIndex(currentIndex - 1);
    }
  };

  const handleSubmitExam = async () => {
    const active = examRef.current;
    if (!active || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalExam: Exam = {
        ...active,
        status: "submitted",
        submittedAt: Date.now(),
      };

      const result = calculateExamResult(finalExam);
      saveActiveExam(finalExam);
      saveExamResult(result);

      router.replace(`/result/${finalExam.id}`);
    } catch (e) {
      console.error("Submission failed", e);
      setIsSubmitting(false);
    }
  };

  if (!exam) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900 min-h-screen text-slate-400">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
          <span>正在进入 Eloise 专属 HSK 考场...</span>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(exam.answers).length;
  const unansweredCount = exam.questions.length - answeredCount;

  return (
    <div className="min-h-screen flex flex-col">
      {layoutMode === "ielts" ? (
        <IeltsExamLayout
          exam={exam}
          currentIndex={currentIndex}
          onSelectQuestionIndex={handleSelectQuestionIndex}
          onSelectAnswer={handleSelectAnswer}
          onToggleMark={handleToggleMark}
          onPrev={handlePrev}
          onNext={handleNext}
          onSubmitClick={() => setShowSubmitModal(true)}
          onToggleHskLayout={() => setLayoutMode("hsk")}
          locale={locale}
        />
      ) : (
        <HskCbtExamLayout
          exam={exam}
          currentIndex={currentIndex}
          onSelectQuestionIndex={handleSelectQuestionIndex}
          onSelectAnswer={handleSelectAnswer}
          onToggleMark={handleToggleMark}
          onPrev={handlePrev}
          onNext={handleNext}
          onSubmitClick={() => setShowSubmitModal(true)}
          onToggleIeltsLayout={() => setLayoutMode("ielts")}
          locale={locale}
        />
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1.5 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span>{locale === "zh" ? "确认提交 HSK 试卷？" : "HSK 답안지를 제출하시겠습니까?"}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              {locale === "zh"
                ? "提交后将立即完成自动判分，并生成包含听力/阅读/书写三科分数的韩文深度解析报告。"
                : "제출 즉시 자동 채점이 진행되며, 듣기/독해/쓰기 영역별 점수와 한국어 심층 해설 성적표가 생성됩니다."}
            </p>

            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 flex justify-around text-center text-xs">
              <div>
                <div className="text-slate-400 font-medium">{locale === "zh" ? "已作答" : "답안 완료"}</div>
                <div className="font-bold text-red-600 text-lg">{answeredCount}</div>
              </div>
              <div className="border-r border-slate-200" />
              <div>
                <div className="text-slate-400 font-medium">{locale === "zh" ? "未作答" : "미완료"}</div>
                <div className="font-bold text-amber-600 text-lg">{unansweredCount}</div>
              </div>
              <div className="border-r border-slate-200" />
              <div>
                <div className="text-slate-400 font-medium">{locale === "zh" ? "标记题" : "표시 문항"}</div>
                <div className="font-bold text-slate-700 text-lg">{exam.markedQuestions.length}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                {locale === "zh" ? "继续做题" : "계속 풀기"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  handleSubmitExam();
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/30 transition transform active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{locale === "zh" ? "确认交卷" : "최종 제출"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitting Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-slate-200">
            <Loader2 className="w-10 h-10 text-red-600 animate-spin mx-auto mb-4" />
            <h4 className="font-bold text-slate-900 mb-1 text-base">
              {locale === "zh" ? "正在自动评分与核算..." : "자동 채점 및 성적 분석 중..."}
            </h4>
            <p className="text-xs text-slate-500">
              {locale === "zh" ? "计算 HSK 三科总分及匹配韩文解析" : "HSK 총점(300점 만점) 및 한국어 해설 생성 중"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
