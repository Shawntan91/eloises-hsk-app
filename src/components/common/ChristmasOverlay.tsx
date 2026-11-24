"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "christmas_2026_seen";

/**
 * Christmas Day only (device local date), plus a ?xmas=1 preview override
 * so the scene can be checked before Dec 25. Dismissing on Dec 25 hides it
 * for the rest of that day (remembered in a non-synced localStorage key).
 */
function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("xmas") === "1") return true;
    const now = new Date();
    if (now.getMonth() === 11 && now.getDate() === 25) {
      return window.localStorage.getItem(SEEN_KEY) !== "2026-12-25";
    }
  } catch {
    return false;
  }
  return false;
}

export default function ChristmasOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShow());
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("xmas") !== "1") {
        window.localStorage.setItem(SEEN_KEY, "2026-12-25");
      }
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black"
      role="dialog"
      aria-label="Merry Christmas"
    >
      <iframe
        src="/christmas-tree/index.html"
        title="Merry Christmas"
        className="absolute inset-0 h-full w-full border-0"
      />
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-4 top-4 z-10 rounded-full border border-white/30 bg-black/40 px-4 py-2 text-sm text-white/90 backdrop-blur transition hover:bg-black/60"
      >
        ✕ 닫기
      </button>
    </div>
  );
}
