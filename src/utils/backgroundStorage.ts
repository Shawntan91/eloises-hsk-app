"use client";

export type PresetThemeId = "default" | "parchment" | "sage" | "dark" | "sakura";

export interface BackgroundPreset {
  id: PresetThemeId;
  nameZh: string;
  nameKo: string;
  style: {
    backgroundColor?: string;
    backgroundImage?: string;
    color?: string;
  };
  previewColor: string;
  isDark?: boolean;
}

export const PRESET_THEMES: BackgroundPreset[] = [
  {
    id: "default",
    nameZh: "极简浅灰 (默认)",
    nameKo: "미니멀 라이트 그레이 (기본)",
    style: {
      backgroundColor: "#f8fafc",
    },
    previewColor: "#f8fafc",
    isDark: false,
  },
  {
    id: "parchment",
    nameZh: "护眼羊皮纸",
    nameKo: "눈편한 양피지 (#fdf6e3)",
    style: {
      backgroundColor: "#fdf6e3",
    },
    previewColor: "#fdf6e3",
    isDark: false,
  },
  {
    id: "sage",
    nameZh: "清新豆沙绿",
    nameKo: "편안한 녹차 그린 (#e8f5e9)",
    style: {
      backgroundColor: "#e8f5e9",
    },
    previewColor: "#e8f5e9",
    isDark: false,
  },
  {
    id: "dark",
    nameZh: "深邃夜间黑",
    nameKo: "다크 나이트 (#0f172a)",
    style: {
      backgroundColor: "#0f172a",
      color: "#f8fafc",
    },
    previewColor: "#0f172a",
    isDark: true,
  },
  {
    id: "sakura",
    nameZh: "温柔樱花粉渐变",
    nameKo: "벚꽃 그라디언트 (핑크)",
    style: {
      backgroundImage: "linear-gradient(135deg, #fff1f2 0%, #fce7f3 50%, #fbcfe8 100%)",
    },
    previewColor: "#fce7f3",
    isDark: false,
  },
];

export interface BackgroundConfig {
  type: "preset" | "image" | "url";
  presetId: PresetThemeId;
  imageUrl?: string;
  hasCustomUpload?: boolean;
  overlayOpacity: number; // 0 ~ 80 (%)
  blur: number; // 0 ~ 20 (px)
  enableInExam: boolean; // whether active during exam
}

export const DEFAULT_BG_CONFIG: BackgroundConfig = {
  type: "preset",
  presetId: "default",
  overlayOpacity: 10,
  blur: 0,
  enableInExam: true,
};

const BG_STORAGE_KEY = "eloise_hsk_background_config_v1";
const DB_NAME = "EloiseHskApp_DB";
const STORE_NAME = "custom_wallpapers";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWallpaperBlobToDB(blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(blob, "active_wallpaper");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error("Failed to save wallpaper blob to IndexedDB:", e);
  }
}

export async function getWallpaperBlobFromDB(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("active_wallpaper");
      req.onsuccess = () => {
        const result = req.result;
        if (!result) {
          resolve(null);
          return;
        }
        if (typeof result === "string") {
          resolve(result);
        } else if (result instanceof Blob) {
          const url = URL.createObjectURL(result);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearWallpaperBlobFromDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete("active_wallpaper");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Ignore error
  }
}

export function getBackgroundConfig(): BackgroundConfig {
  if (typeof window === "undefined") return DEFAULT_BG_CONFIG;
  try {
    const saved = localStorage.getItem(BG_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_BG_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to read bg config:", e);
  }
  return DEFAULT_BG_CONFIG;
}

export function saveBackgroundConfig(config: BackgroundConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("hsk-background-changed", { detail: config }));
  } catch (e) {
    console.error("Failed to save bg config:", e);
  }
}
