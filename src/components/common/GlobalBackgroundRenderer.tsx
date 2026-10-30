"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BackgroundConfig,
  getBackgroundConfig,
  getWallpaperBlobFromDB,
  PRESET_THEMES,
  DEFAULT_BG_CONFIG,
} from "@/utils/backgroundStorage";

export const GlobalBackgroundRenderer: React.FC = () => {
  const pathname = usePathname();
  const [config, setConfig] = useState<BackgroundConfig>(DEFAULT_BG_CONFIG);
  const [dbImageUrl, setDbImageUrl] = useState<string | null>(null);

  const loadConfigAndWallpaper = async () => {
    const current = getBackgroundConfig();
    setConfig(current);

    if (current.type === "image" && current.hasCustomUpload) {
      const url = await getWallpaperBlobFromDB();
      setDbImageUrl(url);
    } else {
      setDbImageUrl(null);
    }
  };

  useEffect(() => {
    loadConfigAndWallpaper();

    const handleBgChange = () => {
      loadConfigAndWallpaper();
    };

    window.addEventListener("hsk-background-changed", handleBgChange);
    return () => {
      window.removeEventListener("hsk-background-changed", handleBgChange);
    };
  }, []);

  const isExamRoute = pathname?.startsWith("/exam");
  if (isExamRoute && !config.enableInExam) {
    return null;
  }

  // Determine what style to apply
  let bgStyle: React.CSSProperties = {
    backgroundColor: "#f8fafc",
  };

  if (config.type === "preset") {
    const preset = PRESET_THEMES.find((p) => p.id === config.presetId) || PRESET_THEMES[0];
    bgStyle = { ...preset.style };
  } else if (config.type === "image" && dbImageUrl) {
    bgStyle = {
      backgroundImage: `url(${dbImageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  } else if (config.type === "url" && config.imageUrl) {
    bgStyle = {
      backgroundImage: `url(${config.imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }

  const blurStyle: React.CSSProperties = {
    filter: config.blur > 0 ? `blur(${config.blur}px)` : undefined,
    transform: config.blur > 0 ? "scale(1.05)" : undefined, // prevent blurry edge artifacts
  };

  const overlayOpacity = Math.max(0, Math.min(80, config.overlayOpacity || 0)) / 100;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden transition-all duration-300"
    >
      {/* Background layer */}
      <div
        className="absolute inset-0 w-full h-full transition-all duration-500 ease-out"
        style={{ ...bgStyle, ...blurStyle }}
      />

      {/* Dimming overlay layer */}
      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black transition-opacity duration-300"
          style={{ opacity: overlayOpacity }}
        />
      )}
    </div>
  );
};
