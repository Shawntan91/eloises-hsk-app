export type OptionKey = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "fill_in_blank"
  | "order_words"
  | "image_writing";

export interface VocabItem {
  word: string;
  pinyin: string;
  meaning: string;
}

export interface Question {
  id: string;
  number: number;
  type: QuestionType;
  section: string;        // e.g. "第一部分 · 听力 (判断题)"
  sectionKo: string;      // e.g. "1영역 · 듣기 (OX 판단)"
  partCategory: "听力" | "阅读" | "书写"; // Category for HSK
  content: string;
  contentKo?: string;
  options: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    [key: string]: string | undefined;
  };
  optionsKo?: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    [key: string]: string | undefined;
  };
  image?: string | null;
  officialAnswer?: string | null; // e.g. "A" or sentence
  explanation?: string;
  explanationKo?: string;
  vocabList?: VocabItem[];
  audioFileName?: string;

  // Reading passage & IELTS split-view support
  passageId?: string | null;
  passageTitle?: string | null;
  passageContent?: string | null;

  // New interactive writing & listening enhancements
  wordsToOrder?: string[];       // 连词成句打乱词块列表
  standardSentence?: string;     // 连词成句标答句子
  requiredWord?: string;         // 看图造句/写作必填关键词
  referenceEssay?: string;       // 参考范文
  audioTimestamp?: number;       // 听力单题定位时间戳（秒）
  transcript?: string;           // 听力原文对话/材料文本
  isCloze?: boolean;             // 完形/选词填空标记
  clozeBlankNumber?: number;     // 选词填空对应题号
}

export interface ParseResult {
  fileName: string;
  fileSize: number;
  totalPages: number;
  isScanned: boolean;
  hasOfficialAnswers: boolean;
  questions: Question[];
}
