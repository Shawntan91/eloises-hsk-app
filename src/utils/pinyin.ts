"use client";

const TONE_MAP: Record<string, string> = {
  ā: "a", á: "a", ǎ: "a", à: "a",
  ō: "o", ó: "o", ǒ: "o", ò: "o",
  ē: "e", é: "e", ě: "e", è: "e",
  ī: "i", í: "i", ǐ: "i", ì: "i",
  ū: "u", ú: "u", ǔ: "u", ù: "u",
  ü: "v", ǖ: "v", ǘ: "v", ǚ: "v", ǜ: "v",
  ń: "n", ň: "n", ǹ: "n",
  ḿ: "m",
};

/**
 * Remove tones, spaces, and punctuation from pinyin to allow fuzzy toneless search.
 * e.g. "ài qìng" -> "aiqing", "Nǐ hǎo!" -> "nihao"
 */
export function stripPinyinTones(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[āáǎàōóǒòēéěèīíǐìūúǔùüǖǘǚǜńňǹḿ]/g, (ch) => TONE_MAP[ch] || ch)
    .replace(/[^a-z0-9]/g, "");
}
