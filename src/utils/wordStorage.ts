"use client";

const KEYS = {
  MASTERED: "eloise_hsk_mastered_words",
  STARRED: "eloise_hsk_starred_words",
  STUDY_INDEX: "eloise_hsk_study_index",
};

export function getMasteredWordNos(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.MASTERED);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function toggleWordMastered(wordNo: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const list = getMasteredWordNos();
    let nextList: number[];
    let isMasteredNow = false;
    if (list.includes(wordNo)) {
      nextList = list.filter((n) => n !== wordNo);
      isMasteredNow = false;
    } else {
      nextList = [...list, wordNo];
      isMasteredNow = true;
    }
    localStorage.setItem(KEYS.MASTERED, JSON.stringify(nextList));
    window.dispatchEvent(new Event("word-progress-changed"));
    return isMasteredNow;
  } catch (e) {
    return false;
  }
}

export function getStarredWordNos(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.STARRED);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function toggleWordStarred(wordNo: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const list = getStarredWordNos();
    let nextList: number[];
    let isStarredNow = false;
    if (list.includes(wordNo)) {
      nextList = list.filter((n) => n !== wordNo);
      isStarredNow = false;
    } else {
      nextList = [...list, wordNo];
      isStarredNow = true;
    }
    localStorage.setItem(KEYS.STARRED, JSON.stringify(nextList));
    window.dispatchEvent(new Event("word-progress-changed"));
    return isStarredNow;
  } catch (e) {
    return false;
  }
}

export function getSavedStudyIndex(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(KEYS.STUDY_INDEX);
    return raw ? parseInt(raw, 10) : 0;
  } catch (e) {
    return 0;
  }
}

export function saveStudyIndex(index: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS.STUDY_INDEX, index.toString());
  } catch (e) {
    // fallback
  }
}
