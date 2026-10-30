"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Palette,
  Upload,
  Link2,
  Sliders,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
  Eye,
  Trash2,
} from "lucide-react";
import {
  BackgroundConfig,
  getBackgroundConfig,
  saveBackgroundConfig,
  saveWallpaperBlobToDB,
  getWallpaperBlobFromDB,
  clearWallpaperBlobFromDB,
  PRESET_THEMES,
  PresetThemeId,
  DEFAULT_BG_CONFIG,
} from "@/utils/backgroundStorage";
import { getLocale } from "@/utils/i18n";

interface BackgroundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackgroundSettingsModal: React.FC<BackgroundSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [config, setConfig] = useState<BackgroundConfig>(DEFAULT_BG_CONFIG);
  const [urlInput, setUrlInput] = useState<string>("");
  const [previewDbUrl, setPreviewDbUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [locale, setLocale] = useState<string>("ko");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocale(getLocale());
    if (isOpen) {
      const current = getBackgroundConfig();
      setConfig(current);
      if (current.type === "url" && current.imageUrl) {
        setUrlInput(current.imageUrl);
      }
      if (current.type === "image" && current.hasCustomUpload) {
        getWallpaperBlobFromDB().then((url) => setPreviewDbUrl(url));
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isKo = locale === "ko";

  const handleSelectPreset = (id: PresetThemeId) => {
    const updated: BackgroundConfig = {
      ...config,
      type: "preset",
      presetId: id,
    };
    setConfig(updated);
    saveBackgroundConfig(updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await saveWallpaperBlobToDB(file);
      const url = URL.createObjectURL(file);
      setPreviewDbUrl(url);

      const updated: BackgroundConfig = {
        ...config,
        type: "image",
        hasCustomUpload: true,
      };
      setConfig(updated);
      saveBackgroundConfig(updated);
    } catch (err) {
      console.error("Failed to upload image:", err);
      alert(isKo ? "이미지 업로드에 실패했습니다." : "图片上传失败，请重试");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    const updated: BackgroundConfig = {
      ...config,
      type: "url",
      imageUrl: urlInput.trim(),
    };
    setConfig(updated);
    saveBackgroundConfig(updated);
  };

  const handleOpacityChange = (val: number) => {
    const updated = { ...config, overlayOpacity: val };
    setConfig(updated);
    saveBackgroundConfig(updated);
  };

  const handleBlurChange = (val: number) => {
    const updated = { ...config, blur: val };
    setConfig(updated);
    saveBackgroundConfig(updated);
  };

  const handleToggleExam = (enable: boolean) => {
    const updated = { ...config, enableInExam: enable };
    setConfig(updated);
    saveBackgroundConfig(updated);
  };

  const handleReset = async () => {
    await clearWallpaperBlobFromDB();
    setPreviewDbUrl(null);
    setUrlInput("");
    setConfig(DEFAULT_BG_CONFIG);
    saveBackgroundConfig(DEFAULT_BG_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                {isKo ? "웹 배경 및 테마 설정" : "全局网页背景与外观"}
              </h3>
              <p className="text-xs text-slate-500">
                {isKo ? "원하는 배경색 또는 사진으로 학습 환경을 꾸며보세요" : "自定义专属学习壁纸、遮罩透明度与护眼色彩"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Section 1: Preset Themes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isKo ? "1. 추천 프리셋 테마" : "1. 预设推荐主题"}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PRESET_THEMES.map((theme) => {
                const isSelected = config.type === "preset" && config.presetId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectPreset(theme.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition relative overflow-hidden group ${
                      isSelected
                        ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/30"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className="w-5 h-5 rounded-full border border-slate-300 shadow-xs"
                        style={{ background: theme.previewColor }}
                      />
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="mt-1">
                      <p className="text-xs font-bold text-slate-800 leading-tight">
                        {isKo ? theme.nameKo : theme.nameZh}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Custom Wallpaper */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
              <span>{isKo ? "2. 나만의 이미지 배경 업로드" : "2. 自定义本地图片 / 网络壁纸"}</span>
            </label>

            <div className="space-y-3">
              {/* Local File Upload */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition shadow-xs ${
                    config.type === "image"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? (isKo ? "업로드 중..." : "正在读取...") : (isKo ? "컴퓨터에서 사진 선택" : "上传本地壁纸图片")}</span>
                </button>
                {previewDbUrl && config.type === "image" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await clearWallpaperBlobFromDB();
                      setPreviewDbUrl(null);
                      handleSelectPreset("default");
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200"
                    title={isKo ? "업로드 사진 삭제" : "删除壁纸"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Online Image URL */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <Link2 className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={isKo ? "이미지 링크 붙여넣기 (https://...)" : "输入在线图片 URL (https://...)"}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  disabled={!urlInput.trim()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition shrink-0"
                >
                  {isKo ? "적용" : "应用"}
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Blur & Overlay Sliders */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>{isKo ? "어둡기 조절 (오버레이)" : "背景暗化遮罩透明度"}</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {config.overlayOpacity || 0}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={config.overlayOpacity || 0}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              className="w-full accent-red-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>{isKo ? "배경 블러 (흐림 효과)" : "背景模糊度"}</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {config.blur || 0}px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={config.blur || 0}
              onChange={(e) => handleBlurChange(Number(e.target.value))}
              className="w-full accent-red-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
            />

            {/* Exam Wallpaper Toggle */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {isKo ? "모의고사 응시 중 배경 활성화" : "考场内启用自定义背景"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {isKo ? "비활성화 시 모의고사 풀이 화면은 표준 집중 배경으로 유지됩니다" : "关闭后，全真模考界面将恢复纯净白底以提高专注度"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleExam(!config.enableInExam)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                  config.enableInExam ? "bg-red-600 justify-end" : "bg-slate-300 justify-start"
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded-lg hover:bg-slate-200/50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isKo ? "기본값 복원" : "恢复默认"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition"
          >
            {isKo ? "완료" : "确定"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundSettingsModal;
