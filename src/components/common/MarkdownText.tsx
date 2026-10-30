"use client";

import React from "react";

interface MarkdownTextProps {
  content?: string | null;
  className?: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, className = "" }) => {
  if (!content) return null;

  const lines = content.split("\n");

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
