"use client";

import { Exam, ExamResult } from "@/types/exam";
import { Question } from "@/types/question";
import { IeltsHighlight } from "@/types/ielts";

export const KEYS = {
  CURRENT_EXAM: "hsk_exam_current",
  EXAM_PREFIX: "hsk_exam_",
  RESULT_PREFIX: "hsk_result_",
  RECENTS: "hsk_exam_recents",
  DRAFT: "hsk_exam_draft",
  SAVED_OPTIONS: "hsk_exam_saved_options",
  REMEMBER_OPTIONS_TOGGLE: "hsk_exam_remember_options",
  HIGHLIGHTS_PREFIX: "hsk_highlights_",
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
  partCategory?: string; // "all" | "listening" | "reading" | "writing"
}

export interface UserExamOptions {
  selectedCountOption: string; // "all" | "10" | "20" | "30" | "50" | "custom"
  customCount: number;
  selectedPartCategory: string; // "all" | "listening" | "reading" | "writing"
  selectedDurationOption: number; // in minutes
  customDuration: number;
  allowPrev: boolean;
  allowMark: boolean;
  autoSubmit: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  answerMode: "official" | "practice";
}

export const DEFAULT_USER_EXAM_OPTIONS: UserExamOptions = {
  selectedCountOption: "all",
  customCount: 10,
  selectedPartCategory: "all",
  selectedDurationOption: 60,
  customDuration: 45,
  allowPrev: true,
  allowMark: true,
  autoSubmit: true,
  shuffleQuestions: false,
  shuffleOptions: false,
  answerMode: "official",
};

// Memory fallback stores
const memoryExamStore = new Map<string, Exam>();
const memoryDraftStore: { draft: Partial<Exam> | null } = { draft: null };
const memoryResultStore = new Map<string, ExamResult>();
const memoryHighlightsStore = new Map<string, IeltsHighlight[]>();

export function isQuotaExceededError(err: any): boolean {
  return (
    err &&
    (err.code === 22 ||
      err.code === 1014 ||
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

export function pruneStorageToFreeSpace(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    const currentExamId = localStorage.getItem(KEYS.CURRENT_EXAM);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(KEYS.EXAM_PREFIX)) {
        const id = key.replace(KEYS.EXAM_PREFIX, "");
        if (id !== currentExamId) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const exam = JSON.parse(raw);
              if (exam.status === "submitted") {
                keysToRemove.push(key);
              }
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }

    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch (e) {
    console.warn("HSK storage prune failed", e);
  }
}

export function safeSetLocalStorage(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      pruneStorageToFreeSpace();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryErr) {
        console.warn(`localStorage quota exceeded for key ${key}; preserving in sessionStorage and memory`, retryErr);
        try {
          sessionStorage.setItem(key, value);
        } catch {}
        return false;
      }
    }
    return false;
  }
}

export function saveActiveExam(exam: Exam): void {
  if (typeof window === "undefined") return;
  memoryExamStore.set(exam.id, exam);
  try {
    const serialized = JSON.stringify(exam);
    safeSetLocalStorage(`${KEYS.EXAM_PREFIX}${exam.id}`, serialized);
    safeSetLocalStorage(KEYS.CURRENT_EXAM, exam.id);
    try {
      sessionStorage.setItem(`${KEYS.EXAM_PREFIX}${exam.id}`, serialized);
    } catch {}

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
  if (memoryExamStore.has(id)) {
    return memoryExamStore.get(id)!;
  }
  try {
    let raw = localStorage.getItem(`${KEYS.EXAM_PREFIX}${id}`);
    if (!raw) {
      raw = sessionStorage.getItem(`${KEYS.EXAM_PREFIX}${id}`);
    }
    if (raw) {
      const exam = JSON.parse(raw);
      memoryExamStore.set(id, exam);
      return exam;
    }
    return null;
  } catch (e) {
    console.error("Failed to load exam", e);
    return null;
  }
}

export function saveExamResult(result: ExamResult): void {
  if (typeof window === "undefined") return;
  memoryResultStore.set(result.examId, result);
  try {
    const serialized = JSON.stringify(result);
    safeSetLocalStorage(`${KEYS.RESULT_PREFIX}${result.examId}`, serialized);
    try {
      sessionStorage.setItem(`${KEYS.RESULT_PREFIX}${result.examId}`, serialized);
    } catch {}

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
  if (memoryResultStore.has(id)) {
    return memoryResultStore.get(id)!;
  }
  try {
    let raw = localStorage.getItem(`${KEYS.RESULT_PREFIX}${id}`);
    if (!raw) {
      raw = sessionStorage.getItem(`${KEYS.RESULT_PREFIX}${id}`);
    }
    if (raw) {
      const res = JSON.parse(raw);
      memoryResultStore.set(id, res);
      return res;
    }
    return null;
  } catch (e) {
    console.error("Failed to load exam result", e);
    return null;
  }
}

export function saveDraftExam(exam: Partial<Exam>): void {
  if (typeof window === "undefined") return;
  memoryDraftStore.draft = exam;
  try {
    const serialized = JSON.stringify(exam);
    try {
      sessionStorage.setItem(KEYS.DRAFT, serialized);
    } catch {}
    safeSetLocalStorage(KEYS.DRAFT, serialized);
  } catch (e) {
    console.error("Failed to save draft exam", e);
  }
}

export function loadDraftExam(): Partial<Exam> | null {
  if (typeof window === "undefined") return null;
  if (memoryDraftStore.draft) return memoryDraftStore.draft;
  try {
    let raw = localStorage.getItem(KEYS.DRAFT);
    if (!raw) raw = sessionStorage.getItem(KEYS.DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function deleteDraftExam(): void {
  if (typeof window === "undefined") return;
  memoryDraftStore.draft = null;
  try {
    localStorage.removeItem(KEYS.DRAFT);
    sessionStorage.removeItem(KEYS.DRAFT);
  } catch {}
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

export function updateRecentExam(item: RecentExamItem): void {
  if (typeof window === "undefined") return;
  try {
    const recents = getRecentExams().filter((r) => r.id !== item.id);
    recents.unshift(item);
    safeSetLocalStorage(KEYS.RECENTS, JSON.stringify(recents.slice(0, 20)));
  } catch (e) {
    console.error("Failed to update recent exam", e);
  }
}

export function deleteRecentExam(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const recents = getRecentExams().filter((r) => r.id !== id);
    safeSetLocalStorage(KEYS.RECENTS, JSON.stringify(recents));
    localStorage.removeItem(`${KEYS.EXAM_PREFIX}${id}`);
    localStorage.removeItem(`${KEYS.RESULT_PREFIX}${id}`);
    sessionStorage.removeItem(`${KEYS.EXAM_PREFIX}${id}`);
    sessionStorage.removeItem(`${KEYS.RESULT_PREFIX}${id}`);
    memoryExamStore.delete(id);
    memoryResultStore.delete(id);
  } catch (e) {
    console.error("Failed to delete recent exam", e);
  }
}

export function clearAllRecentExams(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEYS.RECENTS);
    memoryExamStore.clear();
    memoryResultStore.clear();
  } catch {}
}

// User Settings Persistence
export function isRememberOptionsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(KEYS.REMEMBER_OPTIONS_TOGGLE);
  return raw !== null ? raw === "true" : true;
}

export function setRememberOptionsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  safeSetLocalStorage(KEYS.REMEMBER_OPTIONS_TOGGLE, enabled ? "true" : "false");
}

export function saveUserExamOptions(opts: Partial<UserExamOptions>): void {
  if (typeof window === "undefined") return;
  try {
    safeSetLocalStorage(KEYS.SAVED_OPTIONS, JSON.stringify(opts));
  } catch {}
}

export function loadUserExamOptions(): UserExamOptions | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEYS.SAVED_OPTIONS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Highlights & Notes persistence
export function savePassageHighlights(passageId: string, highlights: IeltsHighlight[]): void {
  if (typeof window === "undefined") return;
  memoryHighlightsStore.set(passageId, highlights);
  try {
    safeSetLocalStorage(`${KEYS.HIGHLIGHTS_PREFIX}${passageId}`, JSON.stringify(highlights));
  } catch {}
}

export function loadPassageHighlights(passageId: string): IeltsHighlight[] {
  if (typeof window === "undefined") return [];
  if (memoryHighlightsStore.has(passageId)) {
    return memoryHighlightsStore.get(passageId)!;
  }
  try {
    const raw = localStorage.getItem(`${KEYS.HIGHLIGHTS_PREFIX}${passageId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
