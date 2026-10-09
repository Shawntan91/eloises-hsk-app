"use client";

export type Locale = "ko" | "zh" | "bilingual";

const LOCALE_KEY = "eloise_hsk_locale";

export function getLocale(): Locale {
  if (typeof window === "undefined") return "ko";
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "zh" || saved === "ko" || saved === "bilingual") {
      return saved;
    }
  } catch (e) {
    // fallback
  }
  return "ko"; // default to Korean for Eloise
}

export function setLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
    window.dispatchEvent(new CustomEvent("hsk-locale-changed", { detail: locale }));
  } catch (e) {
    console.error("Failed to save locale", e);
  }
}

export const I18N = {
  appTitle: {
    ko: "Eloise's HSK APP",
    zh: "Eloise's HSK 考试系统",
    bilingual: "Eloise's HSK APP (HSK 智能模考平台)",
  },
  appSub: {
    ko: "엘로이즈를 위한 HSK 4급 & 5급 CBT 실전 모의고사 및 한국어 심층 해설 시스템",
    zh: "专为 Eloise 打造的 HSK 4级/5级 官方真题机考模考与韩文深度解析系统",
    bilingual: "HSK 4급 & 5급 실전 모의고사 · 全套官方真题与配套听力",
  },
  home: {
    ko: "홈",
    zh: "首页",
    bilingual: "홈 / 首页",
  },
  mistakeBank: {
    ko: "오답 노트",
    zh: "错题本",
    bilingual: "오답 노트 / 错题本",
  },
  startExam: {
    ko: "모의고사 시작",
    zh: "开始模考",
    bilingual: "모의고사 시작 (开始模考)",
  },
  studyReview: {
    ko: "문제 분석 & 학습",
    zh: "审题解析",
    bilingual: "문제 분석 & 학습 (全卷审题)",
  },
  switchLayout: {
    ko: "화면 모드 전환",
    zh: "切换界面",
    bilingual: "화면 전환 / 切换界面",
  },
  hskCbtMode: {
    ko: "HSK 공식 CBT 모드",
    zh: "HSK 官方机考模式",
    bilingual: "HSK 공식 CBT / 官方机考",
  },
  ieltsSplitMode: {
    ko: "아이엘츠 분할 모드",
    zh: "雅思分屏模式",
    bilingual: "아이엘츠 분할 / 雅思分屏",
  },
  audioPlayer: {
    ko: "공식 원본 듣기 오디오",
    zh: "官方原版听力音频",
    bilingual: "공식 듣기 오디오 / 听力音频",
  },
  play: {
    ko: "재생",
    zh: "播放",
    bilingual: "재생 / 播放",
  },
  pause: {
    ko: "일시정지",
    zh: "暂停",
    bilingual: "일시정지 / 暂停",
  },
  speed: {
    ko: "배속",
    zh: "倍速",
    bilingual: "배속 / 倍速",
  },
  submit: {
    ko: "답안 제출",
    zh: "交卷",
    bilingual: "답안 제출 / 确认交卷",
  },
  prevQuestion: {
    ko: "이전 문제",
    zh: "上一题",
    bilingual: "이전 / 上一题",
  },
  nextQuestion: {
    ko: "다음 문제",
    zh: "다음 문제 / 下一题",
    bilingual: "다음 / 下一题",
  },
  mark: {
    ko: "문제 표시",
    zh: "标记本题",
    bilingual: "표시 / 标记本题",
  },
  marked: {
    ko: "표시됨",
    zh: "已标记",
    bilingual: "표시됨 / 已标记",
  },
  correct: {
    ko: "정답",
    zh: "正确",
    bilingual: "정답 / 正确",
  },
  wrong: {
    ko: "오답",
    zh: "错误",
    bilingual: "오답 / 错误",
  },
  unanswered: {
    ko: "미답안",
    zh: "未作答",
    bilingual: "미답안 / 未作答",
  },
  explanation: {
    ko: "한국어 심층 해설",
    zh: "题目权威解析",
    bilingual: "한국어 해설 & 题目解析",
  },
  vocab: {
    ko: "핵심 어휘장",
    zh: "核心词汇表",
    bilingual: "핵심 어휘 / 核心词汇",
  },
  candidateName: {
    ko: "수험생: Eloise (엘로이즈)",
    zh: "考生姓名: Eloise",
    bilingual: "수험생 / 考生: Eloise",
  },
  score: {
    ko: "점수",
    zh: "得分",
    bilingual: "점수 / 得分",
  },
  passed: {
    ko: "합격 (기준 180점 이상)",
    zh: "恭喜通过 (≥180分合格)",
    bilingual: "합격 축하 (≥180分 合格)",
  },
  notPassed: {
    ko: "불합격 (180점 미달)",
    zh: "未达合格线 (<180分)",
    bilingual: "미달 (合格线 180分)",
  },
};
