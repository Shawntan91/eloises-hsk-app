"use client";

import { Exam, ExamResult } from "@/types/exam";
import { Question } from "@/types/question";
import { IeltsHighlight } from "@/types/ielts";

export const DB_VERSION = 2;

export const KEYS = {
  DB_VERSION: "hskapp:db_version",
  CURRENT_EXAM: "hskapp:exam:current",
  EXAM_PREFIX: "hskapp:exam:",
  RESULT_PREFIX: "hskapp:result:",
  RECENTS: "hskapp:recents",
  DRAFT: "hskapp:draft",
  SAVED_OPTIONS: "hskapp:options",
  REMEMBER_OPTIONS_TOGGLE: "hskapp:remember_options",
  HIGHLIGHTS_PREFIX: "hskapp:highlights:",
  BACKUP_SNAPSHOT: "hskapp:backup_snapshot",
  // Legacy keys for automatic migration
  LEGACY_CURRENT_EXAM: "hsk_exam_current",
  LEGACY_EXAM_PREFIX: "hsk_exam_",
  LEGACY_RESULT_PREFIX: "hsk_result_",
  LEGACY_RECENTS: "hsk_exam_recents",
  LEGACY_DRAFT: "hsk_exam_draft",
  LEGACY_SAVED_OPTIONS: "hsk_exam_saved_options",
  LEGACY_HIGHLIGHTS_PREFIX: "hsk_highlights_",
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

// Automatic forward migration from legacy hsk_ keys to hskapp: keys
export function migrateLegacyStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const version = localStorage.getItem(KEYS.DB_VERSION);
    if (version && parseInt(version, 10) >= DB_VERSION) return;

    // Migrate recents
    const legacyRecents = localStorage.getItem(KEYS.LEGACY_RECENTS);
    if (legacyRecents && !localStorage.getItem(KEYS.RECENTS)) {
      localStorage.setItem(KEYS.RECENTS, legacyRecents);
    }

    // Migrate draft
    const legacyDraft = localStorage.getItem(KEYS.LEGACY_DRAFT);
    if (legacyDraft && !localStorage.getItem(KEYS.DRAFT)) {
      localStorage.setItem(KEYS.DRAFT, legacyDraft);
    }

    // Migrate current exam
    const legacyCurrent = localStorage.getItem(KEYS.LEGACY_CURRENT_EXAM);
    if (legacyCurrent && !localStorage.getItem(KEYS.CURRENT_EXAM)) {
      localStorage.setItem(KEYS.CURRENT_EXAM, legacyCurrent);
    }

    // Migrate exams & results
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith(KEYS.LEGACY_EXAM_PREFIX)) {
        const id = k.replace(KEYS.LEGACY_EXAM_PREFIX, "");
        const val = localStorage.getItem(k);
        if (val && !localStorage.getItem(`${KEYS.EXAM_PREFIX}${id}`)) {
          localStorage.setItem(`${KEYS.EXAM_PREFIX}${id}`, val);
        }
      } else if (k.startsWith(KEYS.LEGACY_RESULT_PREFIX)) {
        const id = k.replace(KEYS.LEGACY_RESULT_PREFIX, "");
        const val = localStorage.getItem(k);
        if (val && !localStorage.getItem(`${KEYS.RESULT_PREFIX}${id}`)) {
          localStorage.setItem(`${KEYS.RESULT_PREFIX}${id}`, val);
        }
      }
    }

    localStorage.setItem(KEYS.DB_VERSION, String(DB_VERSION));
  } catch (err) {
    console.warn("Storage migration error", err);
  }
}

if (typeof window !== "undefined") {
  migrateLegacyStorage();
}

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

export function getRecentExams(): RecentExamItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.RECENTS) || localStorage.getItem(KEYS.LEGACY_RECENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load recent exams", e);
    return [];
  }
}

export function saveRecentExams(items: RecentExamItem[]): void {
  if (typeof window === "undefined") return;
  try {
    safeSetLocalStorage(KEYS.RECENTS, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save recent exams", e);
  }
}

export function updateRecentExam(item: RecentExamItem): void {
  const current = getRecentExams();
  const existingIdx = current.findIndex((x) => x.id === item.id);
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...item, updatedAt: Date.now() };
  } else {
    current.unshift(item);
  }
  saveRecentExams(current.slice(0, 20));
}

export function deleteRecentExam(id: string): void {
  const current = getRecentExams();
  const filtered = current.filter((x) => x.id !== id);
  saveRecentExams(filtered);
  try {
    localStorage.removeItem(`${KEYS.EXAM_PREFIX}${id}`);
    localStorage.removeItem(`${KEYS.RESULT_PREFIX}${id}`);
    localStorage.removeItem(`${KEYS.LEGACY_EXAM_PREFIX}${id}`);
    localStorage.removeItem(`${KEYS.LEGACY_RESULT_PREFIX}${id}`);
  } catch {}
}

export function clearAllRecentExams(): void {
  saveRecentExams([]);
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
    let raw =
      localStorage.getItem(`${KEYS.EXAM_PREFIX}${id}`) ||
      localStorage.getItem(`${KEYS.LEGACY_EXAM_PREFIX}${id}`) ||
      sessionStorage.getItem(`${KEYS.EXAM_PREFIX}${id}`);

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
    let raw =
      localStorage.getItem(`${KEYS.RESULT_PREFIX}${id}`) ||
      localStorage.getItem(`${KEYS.LEGACY_RESULT_PREFIX}${id}`) ||
      sessionStorage.getItem(`${KEYS.RESULT_PREFIX}${id}`);

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
    let raw = localStorage.getItem(KEYS.DRAFT) || localStorage.getItem(KEYS.LEGACY_DRAFT);
    if (!raw) raw = sessionStorage.getItem(KEYS.DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function deleteDraftExam(): void {
  memoryDraftStore.draft = null;
  try {
    localStorage.removeItem(KEYS.DRAFT);
    sessionStorage.removeItem(KEYS.DRAFT);
  } catch {}
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
    const raw = localStorage.getItem(KEYS.SAVED_OPTIONS) || localStorage.getItem(KEYS.LEGACY_SAVED_OPTIONS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
    const raw =
      localStorage.getItem(`${KEYS.HIGHLIGHTS_PREFIX}${passageId}`) ||
      localStorage.getItem(`${KEYS.LEGACY_HIGHLIGHTS_PREFIX}${passageId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ================= F1: Full Site Data Export & Import Backup =================

export interface FullBackupData {
  version: number;
  exportedAt: number;
  appName: string;
  recents: RecentExamItem[];
  mistakes: any[];
  masteredWords: number[];
  starredWords: number[];
  studyIndex: number;
  studyGoals: any;
  studyActivity: any;
  sm2Records: any;
  highlights: Record<string, any>;
}

export function exportAllUserData(): string {
  if (typeof window === "undefined") return "{}";
  const { getMistakeBank } = require("./mistakeBank");
  const { getMasteredWordNos, getStarredWordNos, getSavedStudyIndex } = require("./wordStorage");
  const { getStudyGoals, getStudyActivityMap } = require("./studyStats");
  const { loadSM2Records } = require("./sm2");

  // Collect all highlights
  const highlightsMap: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEYS.HIGHLIGHTS_PREFIX)) {
      try {
        highlightsMap[k] = JSON.parse(localStorage.getItem(k) || "[]");
      } catch {}
    }
  }

  const backup: FullBackupData = {
    version: DB_VERSION,
    exportedAt: Date.now(),
    appName: "Eloise's HSK APP",
    recents: getRecentExams(),
    mistakes: getMistakeBank(),
    masteredWords: getMasteredWordNos(),
    starredWords: getStarredWordNos(),
    studyIndex: getSavedStudyIndex(),
    studyGoals: getStudyGoals(),
    studyActivity: getStudyActivityMap(),
    sm2Records: loadSM2Records(),
    highlights: highlightsMap,
  };

  return JSON.stringify(backup, null, 2);
}

export function importUserData(jsonString: string): { success: boolean; message: string } {
  if (typeof window === "undefined") {
    return { success: false, message: "Window not available" };
  }

  try {
    const data: Partial<FullBackupData> = JSON.parse(jsonString);

    if (!data.appName || (!data.recents && !data.mistakes && !data.masteredWords)) {
      return { success: false, message: "유효한 백업 파일 형식이 아닙니다 (Invalid backup schema)." };
    }

    // 1. Snapshot current state before restoring
    const currentBackup = exportAllUserData();
    localStorage.setItem(KEYS.BACKUP_SNAPSHOT, currentBackup);

    // 2. Restore parts
    if (Array.isArray(data.recents)) {
      saveRecentExams(data.recents);
    }

    if (Array.isArray(data.mistakes)) {
      localStorage.setItem("hskapp:mistakes", JSON.stringify(data.mistakes));
      localStorage.setItem("eloise_hsk_mistakes", JSON.stringify(data.mistakes));
      window.dispatchEvent(new Event("mistake-bank-changed"));
    }

    if (Array.isArray(data.masteredWords)) {
      localStorage.setItem("eloise_hsk_mastered_words", JSON.stringify(data.masteredWords));
    }

    if (Array.isArray(data.starredWords)) {
      localStorage.setItem("eloise_hsk_starred_words", JSON.stringify(data.starredWords));
    }

    if (typeof data.studyIndex === "number") {
      localStorage.setItem("eloise_hsk_study_index", String(data.studyIndex));
    }

    if (data.studyGoals) {
      localStorage.setItem("hskapp:study_goals_v1", JSON.stringify(data.studyGoals));
    }

    if (data.studyActivity) {
      localStorage.setItem("hskapp:study_activity_v1", JSON.stringify(data.studyActivity));
    }

    if (data.sm2Records) {
      localStorage.setItem("hskapp:sm2_records", JSON.stringify(data.sm2Records));
    }

    if (data.highlights) {
      Object.entries(data.highlights).forEach(([k, v]) => {
        try {
          localStorage.setItem(k, JSON.stringify(v));
        } catch {}
      });
    }

    // Dispatch global events
    window.dispatchEvent(new Event("word-progress-changed"));
    window.dispatchEvent(new Event("study-activity-changed"));
    window.dispatchEvent(new Event("study-goals-changed"));
    window.dispatchEvent(new Event("sm2-records-changed"));

    return {
      success: true,
      message: `성공적으로 복원되었습니다. (단어 ${data.masteredWords?.length || 0}개, 오답 ${data.mistakes?.length || 0}개)`,
    };
  } catch (err: any) {
    return { success: false, message: `복원 중 오류 발생: ${err.message}` };
  }
}

export function restoreBackupSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const snap = localStorage.getItem(KEYS.BACKUP_SNAPSHOT);
    if (!snap) return false;
    const res = importUserData(snap);
    return res.success;
  } catch {
    return false;
  }
}
