"use client";

import { OralPhraseItem, OralScenarioProgress } from "@/types/oral";

/**
 * Abstract storage adapter for the Oral Studio module.
 * Allows seamless migration from localStorage/IndexedDB to a remote backend DB later.
 */
export interface OralStorageAdapter {
  getPhrases(): Promise<OralPhraseItem[]>;
  savePhrase(item: Omit<OralPhraseItem, "id" | "createdAt" | "mastered">): Promise<OralPhraseItem>;
  togglePhraseMastered(id: string): Promise<void>;
  reviewPhraseSM2(id: string, grade: 5 | 3 | 0): Promise<void>;
  deletePhrase(id: string): Promise<void>;
  hasPhrase(zh: string): Promise<boolean>;

  getScenarioProgress(scenarioId: string): Promise<OralScenarioProgress | null>;
  getAllScenarioProgress(): Promise<Record<string, OralScenarioProgress>>;
  saveScenarioProgress(scenarioId: string, completedGoalIds: string[], isComplete: boolean): Promise<OralScenarioProgress>;
}

const PHRASES_KEY = "eloise_oral_phrasebook_v1";
const PROGRESS_KEY = "eloise_oral_progress_v1";

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T, eventName?: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (eventName) {
      window.dispatchEvent(new Event(eventName));
    }
  } catch (e) {
    console.error(`Failed to write ${key}`, e);
  }
}

export class LocalOralStorageAdapter implements OralStorageAdapter {
  async getPhrases(): Promise<OralPhraseItem[]> {
    return safeReadJson<OralPhraseItem[]>(PHRASES_KEY, []);
  }

  async hasPhrase(zh: string): Promise<boolean> {
    const normalized = zh.trim();
    const list = await this.getPhrases();
    return list.some((p) => p.zh.trim() === normalized);
  }

  async savePhrase(
    item: Omit<OralPhraseItem, "id" | "createdAt" | "mastered">
  ): Promise<OralPhraseItem> {
    const list = await this.getPhrases();
    const existing = list.find((p) => p.zh.trim() === item.zh.trim());
    if (existing) {
      return existing;
    }
    const created: OralPhraseItem = {
      ...item,
      id: `phrase_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      mastered: false,
      createdAt: Date.now(),
      interval: 0,
      repetitions: 0,
      easiness: 2.5,
      nextReviewAt: Date.now(),
    };
    const next = [created, ...list];
    safeWriteJson(PHRASES_KEY, next, "oral-phrasebook-changed");
    return created;
  }

  async togglePhraseMastered(id: string): Promise<void> {
    const list = await this.getPhrases();
    const next = list.map((p) =>
      p.id === id ? { ...p, mastered: !p.mastered } : p
    );
    safeWriteJson(PHRASES_KEY, next, "oral-phrasebook-changed");
  }

  async reviewPhraseSM2(id: string, grade: 5 | 3 | 0): Promise<void> {
    const list = await this.getPhrases();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const next = list.map((p) => {
      if (p.id !== id) return p;
      let interval = p.interval ?? 0;
      let repetitions = p.repetitions ?? 0;
      let easiness = p.easiness ?? 2.5;

      if (grade >= 3) {
        if (repetitions === 0) interval = 1;
        else if (repetitions === 1) interval = grade === 5 ? 6 : 3;
        else interval = Math.round(interval * easiness);
        repetitions++;
      } else {
        repetitions = 0;
        interval = 1;
      }

      easiness = easiness + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
      if (easiness < 1.3) easiness = 1.3;

      return {
        ...p,
        interval,
        repetitions,
        easiness,
        mastered: grade === 5 && repetitions >= 2 ? true : grade === 0 ? false : p.mastered,
        lastReviewedAt: Date.now(),
        nextReviewAt: Date.now() + interval * oneDayMs,
      };
    });
    safeWriteJson(PHRASES_KEY, next, "oral-phrasebook-changed");
  }

  async deletePhrase(id: string): Promise<void> {
    const list = await this.getPhrases();
    const next = list.filter((p) => p.id !== id);
    safeWriteJson(PHRASES_KEY, next, "oral-phrasebook-changed");
  }

  async getAllScenarioProgress(): Promise<Record<string, OralScenarioProgress>> {
    return safeReadJson<Record<string, OralScenarioProgress>>(PROGRESS_KEY, {});
  }

  async getScenarioProgress(scenarioId: string): Promise<OralScenarioProgress | null> {
    const map = await this.getAllScenarioProgress();
    return map[scenarioId] || null;
  }

  async saveScenarioProgress(
    scenarioId: string,
    completedGoalIds: string[],
    isComplete: boolean
  ): Promise<OralScenarioProgress> {
    const map = await this.getAllScenarioProgress();
    const prev = map[scenarioId];
    const mergedGoals = Array.from(
      new Set([...(prev?.completedGoalIds || []), ...completedGoalIds])
    );
    const updated: OralScenarioProgress = {
      scenarioId,
      completedGoalIds: mergedGoals,
      completedCount: (prev?.completedCount || 0) + (isComplete ? 1 : 0),
      lastPracticedAt: Date.now(),
    };
    map[scenarioId] = updated;
    safeWriteJson(PROGRESS_KEY, map, "oral-progress-changed");
    return updated;
  }
}

export const oralStorage: OralStorageAdapter = new LocalOralStorageAdapter();
