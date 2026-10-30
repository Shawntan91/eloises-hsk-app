"use client";

import React, { useEffect, useRef, useState } from "react";
import { getRecentExams, RecentExamItem } from "@/utils/storage";
import { ExamResult } from "@/types/exam";
import { TrendingUp, Download, Image, Sparkles, CheckCircle2 } from "lucide-react";

interface ScoreTrendChartProps {
  currentResult?: ExamResult;
}

export default function ScoreTrendChart({ currentResult }: ScoreTrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [historyItems, setHistoryItems] = useState<RecentExamItem[]>([]);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  useEffect(() => {
    const all = getRecentExams().filter((e) => e.status === "submitted" && typeof e.score === "number");
    // Sort ascending by updatedAt for trend
    all.sort((a, b) => a.updatedAt - b.updatedAt);
    setHistoryItems(all);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const scores = historyItems.map((h) => h.score || 0);
    if (currentResult && (scores.length === 0 || scores[scores.length - 1] !== currentResult.score)) {
      scores.push(currentResult.score);
    }

    if (scores.length < 2) {
      // Draw placeholder if < 2 records
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("최근 2회 이상 모의고사를 응시하시면 성적 변화 추이가 여기에 표시됩니다.", width / 2, height / 2);
      return;
    }

    const paddingX = 40;
    const paddingTop = 30;
    const paddingBottom = 30;
    const plotWidth = width - paddingX * 2;
    const plotHeight = height - paddingTop - paddingBottom;

    // Draw grid lines
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;

    // 180 Pass line (HSK 기준 180/300)
    const passY = paddingTop + plotHeight * (1 - 180 / 300);
    ctx.beginPath();
    ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.moveTo(paddingX, passY);
    ctx.lineTo(width - paddingX, passY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("합격선 180점", paddingX, passY - 4);

    // Draw Trend Line
    const stepX = plotWidth / (scores.length - 1);
    const points: Array<{ x: number; y: number; score: number }> = scores.map((s, idx) => ({
      x: paddingX + idx * stepX,
      y: paddingTop + plotHeight * (1 - Math.min(300, s) / 300),
      score: s,
    }));

    // Area fill under line
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    gradient.addColorStop(0, "rgba(239, 68, 68, 0.25)");
    gradient.addColorStop(1, "rgba(239, 68, 68, 0.0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - paddingBottom);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Points & Labels
    points.forEach((p, idx) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.score >= 180 ? "#10b981" : "#dc2626";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Score Label
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${p.score}점`, p.x, p.y - 10);
    });
  }, [historyItems, currentResult]);

  // Generate 1080x1350 Social Share Card (F8)
  const generateShareCard = () => {
    setIsGeneratingCard(true);
    const targetResult = currentResult;
    if (!targetResult) {
      setIsGeneratingCard(false);
      return;
    }

    const card = document.createElement("canvas");
    card.width = 1080;
    card.height = 1350;
    const ctx = card.getContext("2d");
    if (!ctx) {
      setIsGeneratingCard(false);
      return;
    }

    // 1. Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
    bgGrad.addColorStop(0, "#0f172a");
    bgGrad.addColorStop(0.4, "#1e1b4b");
    bgGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Decorative circle glows
    const glow1 = ctx.createRadialGradient(200, 200, 50, 200, 200, 400);
    glow1.addColorStop(0, "rgba(225, 29, 72, 0.25)");
    glow1.addColorStop(1, "transparent");
    ctx.fillStyle = glow1;
    ctx.beginPath();
    ctx.arc(200, 200, 400, 0, Math.PI * 2);
    ctx.fill();

    const glow2 = ctx.createRadialGradient(880, 900, 50, 880, 900, 450);
    glow2.addColorStop(0, "rgba(79, 70, 229, 0.25)");
    glow2.addColorStop(1, "transparent");
    ctx.fillStyle = glow2;
    ctx.beginPath();
    ctx.arc(880, 900, 450, 0, Math.PI * 2);
    ctx.fill();

    // 2. White Card Container
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.roundRect(80, 100, 920, 1150, 36);
    ctx.fill();

    // 3. Card Header
    ctx.fillStyle = "#dc2626";
    ctx.font = "900 28px sans-serif";
    ctx.fillText("ELOISE'S HSK CBT REPORT", 140, 190);

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 20px sans-serif";
    const dateText = new Date().toLocaleDateString();
    ctx.fillText(dateText + " 응시", 720, 190);

    ctx.fillStyle = "#0f172a";
    ctx.font = "900 44px sans-serif";
    ctx.fillText(targetResult.titleKo || targetResult.title, 140, 260);

    // 4. Pass / Fail Badge & Big Score
    const isPass = targetResult.isPassed;
    const badgeColor = isPass ? "#059669" : "#d97706";
    ctx.fillStyle = badgeColor;
    ctx.roundRect(140, 300, isPass ? 260 : 300, 56, 16);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px sans-serif";
    ctx.fillText(isPass ? "🎉 합격 PASS (180점+)" : "💪 불합격 RETRY", 165, 338);

    // Score Circle Box
    ctx.fillStyle = "#f8fafc";
    ctx.roundRect(140, 390, 800, 220, 28);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("최종 종합 성적 (300점 만점)", 190, 450);

    ctx.fillStyle = isPass ? "#059669" : "#d97706";
    ctx.font = "900 100px monospace";
    ctx.fillText(`${targetResult.score}`, 190, 560);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 34px monospace";
    ctx.fillText("/ 300점", 420, 550);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(`정답률: ${targetResult.accuracyRate}%`, 660, 500);
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`총 오답: ${targetResult.wrongCount + targetResult.unansweredCount}문항`, 660, 545);

    // 5. Section Breakdown Cards (듣기, 독해, 쓰기)
    const secY = 650;
    targetResult.sectionScores.forEach((sec, idx) => {
      const secX = 140 + idx * 275;
      ctx.fillStyle = "#ffffff";
      ctx.roundRect(secX, secY, 250, 180, 20);
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#dc2626";
      ctx.font = "900 22px sans-serif";
      ctx.fillText(sec.partCategoryKo || sec.partCategory, secX + 24, secY + 45);

      ctx.fillStyle = "#0f172a";
      ctx.font = "900 48px monospace";
      ctx.fillText(`${sec.score}점`, secX + 24, secY + 110);

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`정답: ${sec.correct} / ${sec.total}`, secX + 24, secY + 150);
    });

    // 6. Korean Encouragement Quote
    ctx.fillStyle = "#f1f5f9";
    ctx.roundRect(140, 870, 800, 150, 24);
    ctx.fill();

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("💬 Eloise 수험생을 위한 총평 및 격려:", 180, 925);

    ctx.fillStyle = "#475569";
    ctx.font = "500 22px sans-serif";
    const quote = isPass
      ? "공식 기출 합격선(180점)을 넘겼습니다! 약점 영역 오답노트를 복습하여 210점 고득점을 완성하세요!"
      : "아직 실전 기출이 낯설 수 있습니다. 단어장 퀴즈와 문항별 한국어 해설을 복습하면 바로 합격 가능합니다!";
    ctx.fillText(quote.slice(0, 36), 180, 965);
    ctx.fillText(quote.slice(36), 180, 995);

    // 7. Footer branding
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("Eloise's HSK APP · 온라인 모의고사 & 에빙하우스 단어장", 140, 1180);

    // Export image download
    const dataUrl = card.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `HSK_${targetResult.level}급_성적표_Eloise_${Date.now()}.png`;
    a.click();
    setIsGeneratingCard(false);
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-red-600" />
          <h4 className="font-black text-slate-900 text-sm sm:text-base">
            모의고사 성적 추이 & 합격선 달성 그래프 (Trend)
          </h4>
        </div>

        {currentResult && (
          <button
            type="button"
            onClick={generateShareCard}
            disabled={isGeneratingCard}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingCard ? "카드 생성 중..." : "📸 1080×1350 성적표 카드 다운로드"}</span>
          </button>
        )}
      </div>

      <div className="w-full bg-slate-50/70 rounded-2xl p-2 border border-slate-100 flex items-center justify-center overflow-x-auto">
        <canvas
          ref={canvasRef}
          width={650}
          height={180}
          className="w-full max-w-[650px] h-[180px]"
        />
      </div>
    </div>
  );
}
