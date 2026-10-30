"use client";

import hskWordsData from "@/data/hskWords.json";
import { recordSM2Review, loadSM2Records } from "./sm2";
import { getStarredWordNos, toggleWordStarred } from "./wordStorage";
import { logActivity } from "./activityLogger";

export interface CustomWordItem {
  no: number;
  word: string;
  pinyin: string;
  korean: string;
  pos?: string;
  pos_clean?: string;
  pos_ko?: string;
  pos_display?: string;
  isCustom?: boolean;
}

export interface WordSource {
  examId: string;
  questionId?: string | number;
}

const CUSTOM_WORDS_KEY = "eloise_custom_words";
const WORD_SOURCES_KEY = "eloise_word_sources";
const SAVED_WORDS_KEY = "eloise_saved_vocab_words";

export function getCustomWords(): CustomWordItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomWords(words: CustomWordItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(words));
    window.dispatchEvent(new Event("eloise-custom-words-changed"));
  } catch (e) {
    console.error("Failed to save custom words", e);
  }
}

export function getAllWordSources(): Record<number, WordSource> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WORD_SOURCES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveWordSource(wordNo: number, source: WordSource): void {
  if (typeof window === "undefined") return;
  try {
    const sources = getAllWordSources();
    sources[wordNo] = source;
    localStorage.setItem(WORD_SOURCES_KEY, JSON.stringify(sources));
  } catch (e) {
    console.error("Failed to save word source", e);
  }
}

export function getSavedWordStrings(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_WORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSavedWordString(word: string): void {
  if (typeof window === "undefined" || !word) return;
  try {
    const current = getSavedWordStrings();
    if (!current.includes(word)) {
      current.push(word);
      localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(current));
      window.dispatchEvent(new Event("eloise-saved-words-changed"));
    }
  } catch {}
}

export function findWordInDictionary(query: string): CustomWordItem | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // 1. Check built-in words
  const builtIn = (hskWordsData as CustomWordItem[]).find(
    (w) => w.word === trimmed
  );
  if (builtIn) return builtIn;

  // 2. Check custom words
  const custom = getCustomWords().find((w) => w.word === trimmed);
  if (custom) return custom;

  return null;
}

export function isWordInBank(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const savedList = getSavedWordStrings();
  if (savedList.includes(trimmed)) return true;

  const found = findWordInDictionary(trimmed);
  if (!found) return false;

  const sm2Records = loadSM2Records();
  if (sm2Records[found.no]) return true;

  const starred = getStarredWordNos();
  if (starred.includes(found.no)) return true;

  return false;
}

export function addWordToReview(
  wordData: { word: string; pinyin: string; korean: string },
  source?: WordSource
): { success: boolean; alreadyExists: boolean; wordNo: number } {
  const trimmedWord = wordData.word.trim();
  if (!trimmedWord) return { success: false, alreadyExists: false, wordNo: 0 };

  // Check if it already exists in built-in or custom
  const existing = findWordInDictionary(trimmedWord);
  const sm2Records = loadSM2Records();

  let targetNo: number;

  if (existing) {
    targetNo = existing.no;
    const isAlreadyInSm2 = Boolean(sm2Records[targetNo]);

    // Ensure starred in wordStorage
    const starredList = getStarredWordNos();
    if (!starredList.includes(targetNo)) {
      toggleWordStarred(targetNo);
    }

    // Initialize in SM-2 (due today)
    recordSM2Review(targetNo, 0);

    if (source) {
      saveWordSource(targetNo, source);
    }
    addSavedWordString(trimmedWord);

    // Log activity
    logActivity({
      type: "word_study",
      durationSec: 10,
      meta: { word: trimmedWord, wordNo: targetNo },
    });

    return {
      success: true,
      alreadyExists: isAlreadyInSm2,
      wordNo: targetNo,
    };
  } else {
    // Brand new custom word
    const customs = getCustomWords();
    // Assign 90000+ id
    targetNo = 90000 + customs.length + 1;

    const newCustomWord: CustomWordItem = {
      no: targetNo,
      word: trimmedWord,
      pinyin: wordData.pinyin.trim(),
      korean: wordData.korean.trim(),
      pos: "生词",
      pos_clean: "生词",
      pos_ko: "단어",
      pos_display: "生词 (단어)",
      isCustom: true,
    };

    customs.push(newCustomWord);
    saveCustomWords(customs);

    // Initialize in SM-2 (due today)
    recordSM2Review(targetNo, 0);

    if (source) {
      saveWordSource(targetNo, source);
    }
    addSavedWordString(trimmedWord);

    // Log activity
    logActivity({
      type: "word_study",
      durationSec: 10,
      meta: { word: trimmedWord, wordNo: targetNo },
    });

    return {
      success: true,
      alreadyExists: false,
      wordNo: targetNo,
    };
  }
}
