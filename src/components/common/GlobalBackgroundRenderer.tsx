"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  BackgroundSettings,
  DEFAULT_BG_SETTINGS,
  PRESET_BACKGROUNDS,
  getBackgroundSettings,
  getUploadedWallpaper,
} from "@/utils/backgroundStorage";

export const GlobalBackgroundRenderer: React.FC = () => {
  const pathname = usePathname();
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_BG_SETTINGS);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadSettings = async () => {
      const s = getBackgroundSettings();
      setSettings(s);
      if (s.type === "custom_image" || s.hasCustomUpload) {
        const img = await getUploadedWallpaper();
        setUploadedImage(img);
      }
    };

    loadSettings();

    const handleBgChange = async (e: Event) => {
      const customEvt = e as CustomEvent<BackgroundSettings>;
      if (customEvt.detail) {
        setSettings(customEvt.detail);
        if (customEvt.detail.type === "custom_image" || customEvt.detail.hasCustomUpload) {
          const img = await getUploadedWallpaper();
          setUploadedImage(img);
        }
      }
    };

    window.addEventListener("eloise-hsk-bg-changed", handleBgChange);
    return () => {
      window.removeEventListener("eloise-hsk-bg-changed", handleBgChange);
    };
  }, []);

  // Check if in exam room
  const isExamPage = pathname ? pathname.startsWith("/exam") : false;
  const shouldApplyBg =
    settings.enabled &&
    (settings.type !== "preset" || settings.presetId !== "default") &&
    (!isExamPage || settings.enableInExam);

  const activePreset = PRESET_BACKGROUNDS.find((p) => p.id === settings.presetId);
  const isDark =
    shouldApplyBg &&
    ((settings.type === "preset" && activePreset?.isDark) ||
      (settings.type !== "preset" && settings.opacityMask >= 50));

  // Sync body classes
  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;

    if (shouldApplyBg) {
      document.body.classList.add("has-custom-bg");
    } else {
      document.body.classList.remove("has-custom-bg");
    }

    if (isDark) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }

    return () => {
      document.body.classList.remove("has-custom-bg");
      document.body.classList.remove("dark-theme");
    };
  }, [mounted, shouldApplyBg, isDark]);

  if (!mounted || !shouldApplyBg) {
    return null;
  }

  // Calculate background image URL
  let bgImageUrl: string | null = null;
  if (settings.type === "custom_image" && uploadedImage) {
    bgImageUrl = uploadedImage;
  } else if (settings.type === "custom_url" && settings.customUrl) {
    bgImageUrl = settings.customUrl;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden transition-all duration-500 ease-in-out"
    >
      {/* 1. Preset Background Layer */}
      {settings.type === "preset" && activePreset && (
        <div
          className="absolute inset-0 w-full h-full transition-all duration-500"
          style={{
            background: activePreset.value,
          }}
        />
      )}

      {/* 2. Image Wallpaper Layer */}
      {bgImageUrl && (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-300"
          style={{
            backgroundImage: `url(${bgImageUrl})`,
            filter: settings.blur > 0 ? `blur(${settings.blur}px)` : undefined,
            transform: settings.blur > 0 ? "scale(1.06)" : undefined,
          }}
        />
      )}

      {/* 3. Darkening Overlay Layer */}
      {settings.opacityMask > 0 && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${settings.opacityMask / 100})`,
          }}
        />
      )}
    </div>
  );
};

export default GlobalBackgroundRenderer;
