"use client";

import React from "react";

interface MarkdownTextProps {
  content?: string | null;
  className?: string;
}

export function sanitizeExplanationText(
  raw: string,
  questionHint?: {
    type?: string;
    number?: number;
    standardSentence?: string;
    referenceEssay?: string;
    officialAnswer?: string;
    options?: Record<string, string>;
  }
): string {
  let text = raw;

  const isWriting =
    questionHint?.type === "order_words" ||
    questionHint?.type === "image_writing" ||
    (typeof questionHint?.number === "number" && questionHint.number >= 86) ||
    text.includes("【작문 가이드") ||
    text.includes("【어법 및 문장 구성 분석】") ||
    text.includes("【모범 답안】") ||
    text.includes("【정답 문장】") ||
    text.includes("완성 문장:") ||
    text.includes("모범 작문:");

  // 1. If it's a writing / word-order explanation (Q86-100), clean up "정답은 A 입니다" & "다른 선택지(B, C, D)"
  if (isWriting) {
    const sentMatch = text.match(/완성 문장:\s*[“"]?([^”"\n]+?)[”"]?[。.]?\s*(?:\n|$)/);
    const essayMatch = text.match(/모범 작문:\s*(?:官方优秀(?:参考)?范文(?:参考)?：)?[“"]?([^”"\n]+?)[”"]?\s*(?:\n|$)/);

    const stdSent = questionHint?.standardSentence || (sentMatch ? sentMatch[1].trim() : "");
    const modelEssay = questionHint?.referenceEssay || (essayMatch ? essayMatch[1].trim() : "");

    if (stdSent) {
      text = text.replace(
        /【정답 안내】:\s*정답은\s*(?:\*\*)?[A-F](?:\*\*)?\s*입니다[。.]?/,
        `【정답 문장】: **${stdSent}**`
      );
    } else if (modelEssay) {
      text = text.replace(
        /【정답 안내】:\s*정답은\s*(?:\*\*)?[A-F](?:\*\*)?\s*입니다[。.]?/,
        `【모범 답안】: **${modelEssay}**`
      );
    } else {
      text = text.replace(/【정답 안내】:\s*정답은\s*(?:\*\*)?[A-F](?:\*\*)?\s*입니다[。.]?\n*/, "");
    }

    text = text.replace(/\n*【오답 함정 체크】:[^\n]*/g, "");
    text = text.replace(/\n*[^\n]*다른 선택지\([A-D,\s]+\)[^\n]*/g, "");
    text = text.replace(/官方优秀(?:参考)?范文(?:参考)?：/g, "");
  }

  // 2. If it's an ordering explanation (Q56-65, contains 어순 논리 분석 or 正确语序为), fix "정답 순서는 A 입니다"
  const orderMatch =
    text.match(/正确语序为：([A-C-]+)/) ||
    text.match(/올바른 (?:문장 배열 순서는|어순은)\s*(?:\*\*)?([A-C]-[A-C]-[A-C])(?:\*\*)?/) ||
    text.match(/\(([A-C]-[A-C]-[A-C])\)/);

  let seq = orderMatch ? orderMatch[1] : "";
  if (!seq && questionHint?.officialAnswer && /^[A-C]{3}$/.test(questionHint.officialAnswer.trim())) {
    seq = questionHint.officialAnswer.trim().split("").join("-");
  }

  if (seq || text.includes("【어순 논리 분석】")) {
    const finalSeq = seq || "A-C-B";
    text = text.replace(
      /【어순 논리 분석】:\s*정답 순서는\s*(?:\*\*)?[A-D](?:\*\*)?\s*입니다[。.]?/,
      `【어순 논리 분석】: 올바른 문장 배열 순서는 **${finalSeq}** 입니다.`
    );
    text = text.replace(
      /【정답 안내】:\s*정답은\s*\*\*([A-D])\*\*\s*입니다[。.]?/,
      `【정답 안내】: 정답은 **$1** (**${finalSeq}**) 입니다.`
    );
    text = text.replace(
      /•\s*상세 어순:\s*正确语序为：([A-C-]+)[。.]?/,
      `• 상세 어순: 올바른 어순은 **${finalSeq}** 입니다.`
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
