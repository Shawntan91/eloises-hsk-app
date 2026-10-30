"use client";

import React from "react";

interface MarkdownTextProps {
  content?: string | null;
  className?: string;
}

export function sanitizeExplanationText(raw: string): string {
  let text = raw;

  // 1. If it's a writing explanation (contains 작문 가이드 or 어법 및 문장 구성 분석), clean up A placeholder & choice trap
  if (text.includes("【작문 가이드") || text.includes("【어법 및 문장 구성 분석】") || text.includes("【모범 답안】") || text.includes("【정답 문장】")) {
    const essayMatch = text.match(/모범 작문:\s*(?:官方优秀(?:参考)?范文(?:参考)?：)?[“"]?([^”"\n]+)[”"]?/);
    const modelAns = essayMatch ? essayMatch[1].trim() : "";
    if (modelAns) {
      text = text.replace(/【정답 안내】:\s*정답은\s*\*\*A\*\*\s*입니다\.?/, `【모범 답안】: **${modelAns}**`);
    } else {
      text = text.replace(/【정답 안내】:\s*정답은\s*\*\*A\*\*\s*입니다\.?\n*/, "");
    }
    text = text.replace(/\n*【오답 함정 체크】:[^\n]*/g, "");
    text = text.replace(/官方优秀(?:参考)?范文(?:参考)?：/g, "");
  }

  // 2. If it's an ordering explanation (contains 어순 논리 분석 or 正确语序为), fix 정답 순서는 A
  const orderMatch = text.match(/正确语序为：([A-C-]+)/) || text.match(/\(([A-C]-[A-C]-[A-C])\)/);
  if (orderMatch) {
    const seq = orderMatch[1];
    text = text.replace(
      /【어순 논리 분석】:\s*정답 순서는\s*\*\*[A-D]\*\*\s*입니다\.?/,
      `【어순 논리 분석】: 올바른 문장 배열 순서는 **${seq}** 입니다.`
    );
    text = text.replace(
      /•\s*상세 어순:\s*正确语序为：([A-C-]+)。?/,
      `• 상세 어순: 올바른 어순은 **${seq}** 입니다.`
    );
  }

  return text.trim();
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, className = "" }) => {
  if (!content) return null;

  const cleaned = sanitizeExplanationText(content);
  const lines = cleaned.split("\n");

  const parseInline = (line: string): React.ReactNode => {
    // Regex to split by bold (**text**)
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const inner = part.slice(2, -2);
        return (
          <strong
            key={idx}
            className="font-bold text-red-600 bg-red-50/80 px-1 py-0.5 rounded border border-red-200/60 inline-block my-0.5"
          >
            {inner}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className={`space-y-1.5 leading-relaxed font-sans ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Section tags like 【정답 안내】 or 【상세 분석】
        if (trimmed.startsWith("【") && trimmed.includes("】")) {
          return (
            <div key={idx} className="pt-1.5 font-bold text-slate-800">
              {parseInline(line)}
            </div>
          );
        }

        return (
          <div key={idx} className="text-slate-700">
            {parseInline(line)}
          </div>
        );
      })}
    </div>
  );
};

export default MarkdownText;
