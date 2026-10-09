"use client";

import { Exam, ExamResult } from "@/types/exam";

const KEYS = {
  CURRENT_EXAM: "hsk_exam_current",
  EXAM_PREFIX: "hsk_exam_",
  RESULT_PREFIX: "hsk_result_",
  RECENTS: "hsk_exam_recents",
};

export interface RecentExamItem {
  id: string;
  level: number;
  title: string;
  titleKo?: string;
  questionCount: number;
  updatedAt: number;
  status: "ready" | "in_progress" | "submitted";
  score?: number;
}

export function saveActiveExam(exam: Exam): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${KEYS.EXAM_PREFIX}${exam.id}`, JSON.stringify(exam));
    localStorage.setItem(KEYS.CURRENT_EXAM, exam.id);
    updateRecentExam({
      id: exam.id,
      level: exam.level,
      title: exam.title,
      titleKo: exam.titleKo,
      questionCount: exam.questions.length,
      updatedAt: Date.now(),
      status: exam.status,
    });
  } catch (e) {
    console.error("Failed to save active exam", e);
  }
}

export function loadExam(id: string): Exam | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${KEYS.EXAM_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load exam", e);
    return null;
  }
}

export function saveExamResult(result: ExamResult): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${KEYS.RESULT_PREFIX}${result.examId}`, JSON.stringify(result));
    updateRecentExam({
      id: result.examId,
      level: result.level,
      title: result.title,
      titleKo: result.titleKo,
      questionCount: result.totalQuestions,
      updatedAt: Date.now(),
      status: "submitted",
      score: result.score,
    });
    // Sync mistakes
    try {
      const { saveMistakesFromExamResult } = require("./mistakeBank");
      saveMistakesFromExamResult(result);
    } catch (err) {
      console.error("Failed to sync mistakes", err);
    }
  } catch (e) {
    console.error("Failed to save exam result", e);
  }
}

export function loadExamResult(id: string): ExamResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${KEYS.RESULT_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load exam result", e);
    return null;
  }
}

export function getRecentExams(): RecentExamItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.RECENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function updateRecentExam(item: RecentExamItem): void {
  if (typeof window === "undefined") return;
  try {
    const recents = getRecentExams().filter((r) => r.id !== item.id);
    recents.unshift(item);
    localStorage.setItem(KEYS.RECENTS, JSON.stringify(recents.slice(0, 20)));
  } catch (e) {
    console.error("Failed to update recent exam", e);
  }
}

export function deleteRecentExam(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const recents = getRecentExams().filter((r) => r.id !== id);
    localStorage.setItem(KEYS.RECENTS, JSON.stringify(recents));
    localStorage.removeItem(`${KEYS.EXAM_PREFIX}${id}`);
    localStorage.removeItem(`${KEYS.RESULT_PREFIX}${id}`);
  } catch (e) {
    console.error("Failed to delete recent exam", e);
  }
}
