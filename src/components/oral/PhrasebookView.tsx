"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Volume2,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Bookmark,
  Layers,
  List,
  RotateCw,
} from "lucide-react";
import { OralPhraseItem } from "@/types/oral";
import { oralStorage } from "@/lib/oral/storage";
import { playOralTTS, unlockAudioPlayback } from "@/lib/oral/audioClient";
import RubyText from "./RubyText";

type MaskMode = "all" | "hide_hanzi" | "hide_pinyin";

interface PhrasebookViewProps {
  isZh: boolean;
}

export const PhrasebookView: React.FC<PhrasebookViewProps> = ({ isZh }) => {
  const [phrases, setPhrases] = useState<OralPhraseItem[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "flashcard">("list");
  const [maskMode, setMaskMode] = useState<MaskMode>("all");
  const [filterMastered, setFilterMastered] = useState<"all" | "unmastered">("all");
  const [playingId, setPlayingId] = useState<string | null>(null);

  // SM-2 Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  const loadPhrases = async () => {
    const list = await oralStorage.getPhrases();
    setPhrases(list);
  };

  useEffect(() => {
    loadPhrases();
    window.addEventListener("oral-phrasebook-changed", loadPhrases);
    return () => {
      window.removeEventListener("oral-phrasebook-changed", loadPhrases);
    };
  }, []);

  const handlePlay = async (item: OralPhraseItem) => {
    unlockAudioPlayback();
    setPlayingId(item.id);
    await playOralTTS({
      text: item.zh,
      rate: 0.95,
    });
    setPlayingId(null);
  };

  const visiblePhrases = phrases.filter((p) =>
    filterMastered === "all" ? true : !p.mastered
  );

  // Due cards for SM-2 review (fallback to all unmastered if none due)
  const reviewQueue = useMemo(() => {
    const now = Date.now();
    const due = phrases.filter((p) => (p.nextReviewAt ?? 0) <= now);
    if (due.length > 0) return due;
    return phrases.filter((p) => !p.mastered);
  }, [phrases]);

  const currentCard =
    reviewQueue.length > 0
      ? reviewQueue[cardIndex % reviewQueue.length]
      : null;

  const handleSM2Grade = async (grade: 5 | 3 | 0) => {
    if (!currentCard) return;
    await oralStorage.reviewPhraseSM2(currentCard.id, grade);
    setCardFlipped(false);
    setCardIndex((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* List vs Flashcard SM-2 Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 mr-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === "list"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{isZh ? "列表" : "목록"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("flashcard");
                setCardIndex(0);
                setCardFlipped(false);
              }}
              className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                viewMode === "flashcard"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {isZh
                  ? `卡片复习 (${reviewQueue.length})`
                  : `SM-2 카드 복습 (${reviewQueue.length})`}
              </span>
            </button>
          </div>

          {viewMode === "list" &&
            (
              [
                { id: "all", labelZh: "全部显示", labelKo: "전체 보기" },
                { id: "hide_hanzi", labelZh: "隐藏汉字(听音)", labelKo: "한자 가리기(듣기)" },
                { id: "hide_pinyin", labelZh: "隐藏拼音", labelKo: "병음 가리기" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMaskMode(m.id)}
                className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  maskMode === m.id
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {m.id === "all" ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                <span>{isZh ? m.labelZh : m.labelKo}</span>
              </button>
            ))}
        </div>

        {viewMode === "list" && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                setFilterMastered((f) => (f === "all" ? "unmastered" : "all"))
              }
              className={`min-h-[40px] px-3 py-1.5 rounded-xl font-bold border transition ${
                filterMastered === "unmastered"
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              {filterMastered === "unmastered"
                ? isZh
                  ? "仅看未掌握"
                  : "미숙지 표현만"
                : isZh
                ? `全部收藏 (${phrases.length})`
                : `전체 저장 (${phrases.length})`}
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {phrases.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
          <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">
            {isZh
              ? "还没有收藏的地道表达"
              : "아직 저장된 생활 회화 표현이 없어요"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {isZh
              ? "在「听读保温」或「AI 实战」中点击书签图标即可收藏。"
              : "「듣기·따라 말하기」나 「AI 롤플레이」에서 북마크 버튼을 눌러 저장해 보세요."}
          </p>
        </div>
      ) : viewMode === "flashcard" ? (
        /* SM-2 Flashcard Review Mode */
        !currentCard ? (
          <div className="bg-white rounded-3xl border border-emerald-200 p-10 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-base font-black text-slate-900">
              {isZh
                ? "🎉 当前收藏表达已全部复习完成！"
                : "🎉 오늘 복습할 회화 표현을 모두 마쳤어요!"}
            </p>
            <p className="text-xs text-slate-500">
              {isZh
                ? "根据艾宾浩斯 SM-2 记忆曲线，到期后会自动提醒复习。"
                : "SM-2 망각곡선 알고리즘에 따라 복습 시기가 되면 다시 나타나요."}
            </p>
          </div>
        ) : (
          <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold">
                {isZh
                  ? `待复习 ${reviewQueue.length} 句`
                  : `복습 대기 ${reviewQueue.length}개`}
              </span>
              {currentCard.scenarioTitleZh && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                  {isZh
                    ? currentCard.scenarioTitleZh
                    : currentCard.scenarioTitleKo}
                </span>
              )}
            </div>

            <div className="min-h-[180px] flex flex-col items-center justify-center text-center space-y-4 py-4">
              <p className="text-base sm:text-lg font-bold text-slate-800">
                {currentCard.ko}
              </p>

              <button
                type="button"
                onClick={() => handlePlay(currentCard)}
                className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition ${
                  playingId === currentCard.id
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isZh ? "听中文发音" : "중국어 발음 듣기"}</span>
              </button>

              {cardFlipped ? (
                <div className="w-full pt-4 border-t border-slate-100 space-y-2 animate-in fade-in">
                  <div className="text-xl sm:text-2xl font-black text-emerald-900">
                    <RubyText text={currentCard.zh} showPinyin={true} />
                  </div>
                  {currentCard.noteKo && (
                    <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2 inline-block">
                      💡 {currentCard.noteKo}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCardFlipped(true)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold inline-flex items-center gap-1.5 transition"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>{isZh ? "点击显示中文答案" : "중국어 정답 보기"}</span>
                </button>
              )}
            </div>

            {cardFlipped && (
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSM2Grade(0)}
                  className="min-h-[48px] py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition"
                >
                  {isZh ? "忘了 (明天见)" : "몰라요 (내일 다시)"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSM2Grade(3)}
                  className="min-h-[48px] py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition"
                >
                  {isZh ? "模糊 (巩固)" : "애매해요 (조금 뒤)"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSM2Grade(5)}
                  className="min-h-[48px] py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                >
                  {isZh ? "脱口而出 ✓" : "알아요 ✓"}
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        /* Standard List View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visiblePhrases.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 transition ${
                item.mastered
                  ? "bg-emerald-50/40 border-emerald-200"
                  : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {item.scenarioTitleZh && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 mb-1.5">
                      {isZh ? item.scenarioTitleZh : item.scenarioTitleKo}
                    </span>
                  )}

                  {maskMode === "hide_hanzi" ? (
                    <div className="py-2 px-3 rounded-xl bg-slate-100 text-xs font-medium text-slate-500 italic">
                      {isZh
                        ? "汉字已遮挡 — 点击右侧喇叭听音复习"
                        : "한자 가림 — 오른쪽 스피커를 눌러 듣고 떠올려 보세요"}
                    </div>
                  ) : (
                    <div className="text-base font-bold text-slate-900">
                      <RubyText
                        text={item.zh}
                        showPinyin={maskMode === "all"}
                      />
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
                    {item.ko}
                  </p>

                  {item.noteKo && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2">
                      💡 {item.noteKo}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePlay(item)}
                    className={`min-w-[44px] min-h-[44px] p-2 rounded-xl border flex items-center justify-center transition ${
                      playingId === item.id
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    }`}
                    title={isZh ? "朗读" : "발음 듣기"}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => oralStorage.togglePhraseMastered(item.id)}
                    className={`min-w-[44px] min-h-[44px] p-2 rounded-xl border flex items-center justify-center transition ${
                      item.mastered
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                    }`}
                    title={isZh ? "标记已掌握" : "숙지 완료 표시"}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => oralStorage.deletePhrase(item.id)}
                    className="min-w-[44px] min-h-[44px] p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                    title={isZh ? "删除" : "삭제"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhrasebookView;
