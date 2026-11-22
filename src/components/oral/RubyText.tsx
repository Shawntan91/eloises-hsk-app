"use client";

import React, { useMemo } from "react";
import { pinyin } from "pinyin-pro";

interface RubyTextProps {
  text: string;
  showPinyin: boolean;
  className?: string;
}

const CJK_REGEX = /[\u4e00-\u9fff]/;

export const RubyText: React.FC<RubyTextProps> = ({
  text,
  showPinyin,
  className = "",
}) => {
  const tokens = useMemo(() => {
    if (!showPinyin || !text) return null;
    try {
      return pinyin(text, {
        type: "all",
        toneType: "symbol",
      });
    } catch {
      return null;
    }
  }, [text, showPinyin]);

  if (!showPinyin || !tokens) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`leading-[2.15] ${className}`}>
      {tokens.map((item, idx) => {
        const isHanzi = CJK_REGEX.test(item.origin);
        if (!isHanzi || !item.pinyin) {
          return <React.Fragment key={idx}>{item.origin}</React.Fragment>;
        }
        return (
          <ruby key={idx} className="mx-[0.5px]">
            {item.origin}
            <rp>(</rp>
            <rt className="text-[10px] font-normal text-slate-500 select-none tracking-tight">
              {item.pinyin}
            </rt>
            <rp>)</rp>
          </ruby>
        );
      })}
    </span>
  );
};

export default RubyText;
