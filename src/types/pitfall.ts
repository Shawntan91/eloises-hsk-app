export type PitfallCategory =
  | "tone"
  | "measure_word"
  | "ba_sentence"
  | "bei_sentence"
  | "le_guo";

export interface PitfallQuestion {
  id: string;
  category: PitfallCategory;
  categoryNameZh: string;
  categoryNameKo: string;
  question: string;
  options: string[]; // e.g. ["A. ...", "B. ...", "C. ...", "D. ..."]
  answer: string; // "A" | "B" | "C" | "D"
  explanation_zh: string;
  explanation_ko: string;
  tip: string; // 为什么韩国人容易错 (한국인 수험생 주의 포인트)
}

export interface PitfallCategoryStat {
  category: PitfallCategory;
  categoryNameZh: string;
  categoryNameKo: string;
  totalPracticed: number;
  correctCount: number;
  accuracyRate: number;
}
