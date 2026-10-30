"use client";

/**
 * Eloise Activity Logger
 * 记录用户在模考、背词、听力跟读、易错专项等各个模块的学习行为
 * 数据持久化于 localStorage: eloise_activity_log
 * 保留最近 12 周记录，防止 localStorage 膨胀
 */

export interface ActivityLogEntry {
  ts: number; // timestamp in ms
  type: "exam" | "word_study" | "word_review" | "shadowing" | "pitfall";
  durationSec: number;
  correct?: number;
  total?: number;
  score?: number;
  meta?: Record<string, any>;
}

const STORAGE_KEY = "eloise_activity_log";
const MAX_RETENTION_MS = 12 * 7 * 24 * 60 * 60 * 1000; // 12 weeks

export function getActivityLogs(): ActivityLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const logs: ActivityLogEntry[] = JSON.parse(raw);
    const cutoff = Date.now() - MAX_RETENTION_MS;
    return logs.filter((l) => l.ts >= cutoff);
  } catch (e) {
    console.error("Failed to load activity logs", e);
    return [];
  }
}

export function logActivity(entry: Omit<ActivityLogEntry, "ts"> & { ts?: number }): void {
  if (typeof window === "undefined") return;
  try {
    const current = getActivityLogs();
    const newEntry: ActivityLogEntry = {
      ...entry,
      ts: entry.ts || Date.now(),
    };
    current.push(newEntry);

    // Prune entries older than 12 weeks
    const cutoff = Date.now() - MAX_RETENTION_MS;
    const pruned = current.filter((l) => l.ts >= cutoff);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
    window.dispatchEvent(new CustomEvent("eloise-activity-logged", { detail: newEntry }));
  } catch (e) {
    console.warn("Failed to write activity log", e);
  }
}
