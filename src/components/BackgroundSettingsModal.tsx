"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Palette,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Sliders,
  Check,
  Sparkles,
  Eye,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import {
  BackgroundSettings,
  PRESET_BACKGROUNDS,
  SAMPLE_WALLPAPERS,
  DEFAULT_BG_SETTINGS,
  getBackgroundSettings,
  saveBackgroundSettings,
  saveUploadedWallpaper,
  getUploadedWallpaper,
  clearUploadedWallpaper,
  resetBackgroundSettings,
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
  const [mounted, setMounted] = useState<boolean>(false);
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_BG_SETTINGS);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"preset" | "upload" | "url">("preset");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>("ko");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocale(getLocale());
    if (isOpen) {
      const s = getBackgroundSettings();
      setSettings(s);
      setUrlInput(s.customUrl || "");
      if (s.type === "custom_image" || s.hasCustomUpload) {
        setActiveTab("upload");
        getUploadedWallpaper().then((img) => {
          setUploadedPreview(img);
        });
      } else if (s.type === "custom_url") {
        setActiveTab("url");
      } else {
        setActiveTab("preset");
      }
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const isKo = locale === "ko";

  // 1. Select Preset
  const handleSelectPreset = (presetId: string) => {
    const updated: BackgroundSettings = {
      ...settings,
      enabled: presetId !== "default",
      type: "preset",
      presetId,
    };
    setSettings(updated);
    saveBackgroundSettings(updated);
    showToast(isKo ? "배경 테마가 적용되었습니다" : "已切换至预设主题");
  };

  // 2. Upload Local Image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast(isKo ? "이미지 파일만 업로드할 수 있습니다" : "仅支持上传图片文件");
      return;
    }

    setUploadLoading(true);
    try {
      await saveUploadedWallpaper(file);
      const previewUrl = URL.createObjectURL(file);
      setUploadedPreview(previewUrl);

      const updated: BackgroundSettings = {
        ...settings,
        enabled: true,
        type: "custom_image",
        hasCustomUpload: true,
      };
      setSettings(updated);
      saveBackgroundSettings(updated);
      showToast(isKo ? "로컬 사진 배경이 적용되었습니다" : "自定义本地壁纸已成功应用");
    } catch (err) {
      console.error(err);
      showToast(isKo ? "업로드 중 오류가 발생했습니다" : "壁纸上传失败，请重试");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleClearUpload = async () => {
    await clearUploadedWallpaper();
    setUploadedPreview(null);
    const updated: BackgroundSettings = {
      ...settings,
      type: "preset",
      presetId: "default",
      hasCustomUpload: false,
      enabled: false,
    };
    setSettings(updated);
    saveBackgroundSettings(updated);
    showToast(isKo ? "업로드된 벽지가 삭제되었습니다" : "已清除自定义壁纸并恢复默认");
  };

  // 3. Online Image URL
  const handleApplyUrl = (directUrl?: string) => {
    const targetUrl = directUrl || urlInput.trim();
    if (!targetUrl) {
      showToast(isKo ? "이미지 링크를 입력해주세요" : "请输入有效的图片链接");
      return;
    }
    const updated: BackgroundSettings = {
      ...settings,
      enabled: true,
      type: "custom_url",
      customUrl: targetUrl,
    };
    setSettings(updated);
    saveBackgroundSettings(updated);
    setUrlInput(targetUrl);
    showToast(isKo ? "온라인 배경 사진이 적용되었습니다" : "网络壁纸已成功应用");
  };

  // 4. Sliders & Switch
  const handleMaskChange = (val: number) => {
    const updated = { ...settings, opacityMask: val };
    setSettings(updated);
    saveBackgroundSettings(updated);
  };

  const handleBlurChange = (val: number) => {
    const updated = { ...settings, blur: val };
    setSettings(updated);
    saveBackgroundSettings(updated);
  };

  const handleToggleExam = () => {
    const updated = { ...settings, enableInExam: !settings.enableInExam };
    setSettings(updated);
    saveBackgroundSettings(updated);
  };

  const handleResetAll = () => {
    resetBackgroundSettings();
    setUploadedPreview(null);
    setUrlInput("");
    setSettings(DEFAULT_BG_SETTINGS);
    showToast(isKo ? "모든 배경 설정이 초기화되었습니다" : "已重置为系统默认外观");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl my-auto flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Feedback */}
        {toastMsg && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Modal Header (Fixed / Non-collapsing) */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                {isKo ? "웹 배경 및 테마 설정" : "全局网页背景与外观"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isKo
                  ? "원하는 배경색 또는 사진으로 편안한 학습 환경을 꾸며보세요"
                  : "选择护眼主题、上传专属壁纸，支持暗化遮罩与毛玻璃特效"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="shrink-0 px-6 pt-3 border-b border-slate-100 flex items-center gap-4 bg-slate-50/40">
          {[
            { id: "preset", labelZh: "预设护眼色彩", labelKo: "추천 프리셋 테마", icon: Palette },
            { id: "upload", labelZh: "本地电脑壁纸", labelKo: "컴퓨터 사진 업로드", icon: Upload },
            { id: "url", labelZh: "网络壁纸链接", labelKo: "온라인 이미지 URL", icon: LinkIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
                  isTabActive
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{isKo ? tab.labelKo : tab.labelZh}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body (Scrollable with min-h-0) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PRESETS */}
          {activeTab === "preset" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isKo ? "7가지 감성 프리셋 선택" : "推荐护眼色彩与渐变主题"}</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {isKo ? "클릭 즉시 실시간 반영" : "点击即可实时预览"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PRESET_BACKGROUNDS.map((item) => {
                  const isSelected =
                    settings.type === "preset" && settings.presetId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPreset(item.id)}
                      className={`relative p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between h-28 group ${
                        isSelected
                          ? "border-red-600 ring-2 ring-red-500/20 shadow-md"
                          : "border-slate-200 hover:border-red-300 hover:shadow-xs"
                      }`}
                      style={{
                        background: item.value,
                      }}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            item.isDark
                              ? "bg-slate-800/80 text-white"
                              : "bg-white/80 text-slate-800 shadow-2xs backdrop-blur-xs"
                          }`}
                        >
                          {isKo ? item.nameKo : item.nameZh}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p
                        className={`text-[11px] leading-snug ${
                          item.isDark ? "text-slate-300" : "text-slate-600"
                        }`}
                      >
                        {isKo ? item.descriptionKo : item.descriptionZh}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LOCAL IMAGE UPLOAD */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {isKo ? "컴퓨터에서 나만의 사진 업로드" : "上传自定义本地壁纸"}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isKo
                      ? "브라우저 고속 IndexedDB에 안전하게 저장되어 서버로 전송되지 않습니다"
                      : "自动存储在浏览器高速 IndexedDB 中，大图流畅不卡顿"}
                  </p>
                </div>
                {uploadedPreview && (
                  <button
                    type="button"
                    onClick={handleClearUpload}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                  >
                    {isKo ? "현재 벽지 지우기" : "清除壁纸"}
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {uploadedPreview ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-red-500 shadow-md h-48 bg-slate-900 group">
                  <img
                    src={uploadedPreview}
                    alt="Custom Wallpaper"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-white/90 hover:bg-white text-slate-900 text-xs font-bold rounded-xl shadow-lg transition cursor-pointer"
                    >
                      {isKo ? "다른 사진으로 교체" : "重新上传更换"}
                    </button>
                  </div>
                  <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                    {isKo ? "현재 적용된 배경" : "当前生效壁纸"}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-50/50 hover:bg-red-50/20"
                >
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {uploadLoading ? (isKo ? "고화질 처리 중..." : "正在处理高清图片...") : (isKo ? "컴퓨터에서 사진 선택" : "点击选择电脑本地图片")}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    JPG, PNG, WebP (1920×1080 권장)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ONLINE URL & SAMPLES */}
          {activeTab === "url" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-1">
                  {isKo ? "온라인 이미지 주소 입력" : "输入在线图片链接"}
                </h4>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyUrl()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {isKo ? "적용" : "应用"}
                  </button>
                </div>
              </div>

              {/* Sample Wallpapers */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-500 block mb-2">
                  {isKo ? "추천 고화질 자습 벽지 (클릭 시 즉시 적용):" : "一键试用高清自习壁纸："}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SAMPLE_WALLPAPERS.map((sample) => (
                    <button
                      key={sample.nameZh}
                      type="button"
                      onClick={() => handleApplyUrl(sample.url)}
                      className="group relative h-20 rounded-xl overflow-hidden border border-slate-200 hover:border-red-500 transition text-left cursor-pointer shadow-2xs"
                    >
                      <img
                        src={sample.url}
                        alt={sample.nameZh}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                        <span className="text-[11px] font-bold text-white drop-shadow">
                          {isKo ? sample.nameKo : sample.nameZh}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION: SLIDERS & EXAM TOGGLE */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                <span>{isKo ? "어둡기 조절 (오버레이)" : "背景暗化遮罩透明度"}</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {settings.opacityMask || 0}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={settings.opacityMask || 0}
              onChange={(e) => handleMaskChange(Number(e.target.value))}
              className="w-full accent-red-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>{isKo ? "배경 블러 (흐림 효과)" : "背景模糊度"}</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-600">
                {settings.blur || 0}px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={settings.blur || 0}
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
                  {isKo
                    ? "비활성화 시 모의고사 풀이 화면은 표준 집중 배경으로 유지됩니다"
                    : "关闭后，全真模考界面将恢复纯净白底以提高专注度"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleExam}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 cursor-pointer ${
                  settings.enableInExam ? "bg-red-600 justify-end" : "bg-slate-300 justify-start"
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer (Fixed / Non-collapsing) */}
        <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isKo ? "기본값 복원" : "恢复默认"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            {isKo ? "완료" : "确定"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BackgroundSettingsModal;
