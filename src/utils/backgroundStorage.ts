"use client";

/**
 * 全局自定义网页背景与主题存储管理器
 * 支持 localStorage 保存轻量配置、IndexedDB 存储大体积高清壁纸
 */

export type BackgroundType = "preset" | "custom_image" | "custom_url";

export interface PresetBackground {
  id: string;
  nameZh: string;
  nameKo: string;
  category: "solid" | "gradient" | "dark";
  value: string; // CSS color or linear-gradient
  previewBg: string;
  isDark?: boolean;
  descriptionZh: string;
  descriptionKo: string;
}

export const PRESET_BACKGROUNDS: PresetBackground[] = [
  {
    id: "default",
    nameZh: "默认浅灰",
    nameKo: "기본 라이트 그레이",
    category: "solid",
    value: "#f8fafc",
    previewBg: "bg-slate-100 border-slate-300",
    descriptionZh: "经典浅灰，极简干净",
    descriptionKo: "미니멀하고 깨끗한 기본 배경",
  },
  {
    id: "parchment",
    nameZh: "护眼羊皮纸",
    nameKo: "눈편한 양피지 (#fdf6e3)",
    category: "solid",
    value: "#fdf6e3",
    previewBg: "border-amber-300",
    descriptionZh: "柔和米黄，舒缓双眼防疲劳",
    descriptionKo: "부드러운 베이지톤, 눈의 피로 감소",
  },
  {
    id: "eyecare_green",
    nameZh: "豆沙绿",
    nameKo: "편안한 녹차 그린 (#e8f5e9)",
    category: "solid",
    value: "#e8f5e9",
    previewBg: "border-emerald-300",
    descriptionZh: "经典温和绿，长时间做题不刺眼",
    descriptionKo: "장시간 학습에도 편안한 힐링 그린",
  },
  {
    id: "dark_night",
    nameZh: "深色夜间",
    nameKo: "다크 나이트 (#0f172a)",
    category: "dark",
    value: "#0f172a",
    previewBg: "border-slate-800",
    isDark: true,
    descriptionZh: "沉浸深邃暗夜，适合夜间专注刷题",
    descriptionKo: "깊이 있는 야간 모드, 높은 집중도",
  },
  {
    id: "sakura_pink",
    nameZh: "樱花粉渐变",
    nameKo: "벚꽃 핑크 그라디언트",
    category: "gradient",
    value: "linear-gradient(135deg, #fff1f2 0%, #fdf2f8 50%, #f5f3ff 100%)",
    previewBg: "border-pink-300",
    descriptionZh: "清新柔和粉紫，温润通透",
    descriptionKo: "화사하고 포근한 핑크빛 무드",
  },
  {
    id: "ocean_breeze",
    nameZh: "清凉海风",
    nameKo: "청량한 오션 브리즈",
    category: "gradient",
    value: "linear-gradient(135deg, #e0f2fe 0%, #e0e7ff 50%, #ede9fe 100%)",
    previewBg: "border-blue-300",
    descriptionZh: "天青到薰衣草，清爽宁静",
    descriptionKo: "맑은 하늘과 바다처럼 차분한 블루",
  },
  {
    id: "sunset_warmth",
    nameZh: "晚霞暮光",
    nameKo: "노을빛 선셋 웜",
    category: "gradient",
    value: "linear-gradient(135deg, #ffedd5 0%, #fee2e2 50%, #f5d0fe 100%)",
    previewBg: "border-orange-300",
    descriptionZh: "暖橙与落霞，温和舒适",
    descriptionKo: "따스한 온기와 노을 감성",
  },
];

// 推荐的高清无版权壁纸样例（用于一键快速体验）
export const SAMPLE_WALLPAPERS = [
  {
    nameZh: "静谧图书馆",
    nameKo: "조용한 도서관",
    url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1920&q=80",
  },
  {
    nameZh: "极简自习书桌",
    nameKo: "미니멀 서재 데스크",
    url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1920&q=80",
  },
  {
    nameZh: "深邃星空",
    nameKo: "깊은 밤 은하수",
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
  },
  {
    nameZh: "晨曦雪山",
    nameKo: "새벽 설산 풍경",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80",
  },
];

export interface BackgroundSettings {
  enabled: boolean;
  type: BackgroundType;
  presetId: string;
  customUrl: string;
  hasCustomUpload: boolean;
  opacityMask: number; // 0 ~ 80 (%)
  blur: number; // 0 ~ 20 (px)
  enableInExam: boolean; // 考场内是否启用壁纸
}

export const DEFAULT_BG_SETTINGS: BackgroundSettings = {
  enabled: false,
  type: "preset",
  presetId: "default",
  customUrl: "",
  hasCustomUpload: false,
  opacityMask: 15,
  blur: 0,
  enableInExam: false,
};

const STORAGE_KEY = "eloise_hsk_bg_settings_v2";
const DB_NAME = "EloiseHskApp_DB";
const STORE_NAME = "custom_wallpapers";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveUploadedWallpaper(file: File): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(file, "wallpaper_blob");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getUploadedWallpaper(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("wallpaper_blob");
      req.onsuccess = () => {
        const result = req.result;
        if (!result) {
          resolve(null);
          return;
        }
        if (typeof result === "string") {
          resolve(result);
        } else if (result instanceof Blob) {
          resolve(URL.createObjectURL(result));
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

export async function clearUploadedWallpaper(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete("wallpaper_blob");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }
}

export function getBackgroundSettings(): BackgroundSettings {
  if (typeof window === "undefined") return DEFAULT_BG_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_BG_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error("Failed to read bg settings", e);
  }
  return DEFAULT_BG_SETTINGS;
}

export function saveBackgroundSettings(settings: BackgroundSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(
      new CustomEvent<BackgroundSettings>("eloise-hsk-bg-changed", {
        detail: settings,
      })
    );
  } catch (e) {
    console.error("Failed to save bg settings", e);
  }
}

export function resetBackgroundSettings(): void {
  saveBackgroundSettings(DEFAULT_BG_SETTINGS);
  clearUploadedWallpaper();
}
