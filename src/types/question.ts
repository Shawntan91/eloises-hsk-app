export type OptionKey = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export type QuestionType = "single_choice" | "multiple_choice" | "fill_in_blank";

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
  officialAnswer?: string | null; // e.g. "A" or "B"
  explanation?: string;
  explanationKo?: string;
  vocabList?: VocabItem[];
  audioFileName?: string;

  // Reading passage & IELTS split-view support
  passageId?: string | null;
  passageTitle?: string | null;
  passageContent?: string | null;
}

export interface ParseResult {
  fileName: string;
  fileSize: number;
  totalPages: number;
  isScanned: boolean;
  hasOfficialAnswers: boolean;
  questions: Question[];
}
