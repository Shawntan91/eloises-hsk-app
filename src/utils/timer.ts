export const UNLIMITED_DURATION_THRESHOLD = 500000;

export function isUnlimitedDuration(durationSeconds?: number): boolean {
  if (durationSeconds === undefined || durationSeconds === null) return false;
  return durationSeconds <= 0 || durationSeconds >= UNLIMITED_DURATION_THRESHOLD;
}

export function formatSeconds(
  totalSeconds: number,
  locale: "ko" | "zh" | "bilingual" = "ko"
): string {
  if (totalSeconds >= UNLIMITED_DURATION_THRESHOLD) {
    return locale === "zh" ? "不限时" : "시간 무제한";
  }

  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    const hh = String(hours).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function getRemainingSeconds(startTime: number, durationSeconds: number): number {
  if (isUnlimitedDuration(durationSeconds)) {
    return 999999;
  }
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return Math.max(0, durationSeconds - elapsed);
}

export function getSectionRangeLabel(
  questionsOrItem:
    | Array<{ number: number; partCategory?: string }>
    | {
        sections?: Record<
          string,
          { count: number; start: number; end: number; isContiguous: boolean }
        >;
      },
  cat: "听力" | "阅读" | "书写",
  locale: "ko" | "zh" | "bilingual" = "ko"
): string {
  const catName =
    locale === "zh"
      ? cat
      : cat === "听力"
      ? "듣기"
      : cat === "阅读"
      ? "독해"
      : "쓰기";

  // If passed an exam manifest item with precomputed sections
  if (
    questionsOrItem &&
    typeof questionsOrItem === "object" &&
    !Array.isArray(questionsOrItem) &&
    "sections" in questionsOrItem &&
    questionsOrItem.sections
  ) {
    const sec = questionsOrItem.sections[cat];
    if (!sec || sec.count === 0) return catName;
    if (sec.count === 1) return `${catName} (${sec.start})`;
    if (sec.isContiguous) return `${catName} (${sec.start}~${sec.end})`;
    return `${catName} (${sec.count}${locale === "zh" ? "题" : "문항"})`;
  }

  const questions = Array.isArray(questionsOrItem) ? questionsOrItem : [];
  const catQs = questions.filter((q) => q.partCategory === cat);
  if (catQs.length === 0) return catName;

  const nums = catQs.map((q) => q.number).sort((a, b) => a - b);
  const minNum = nums[0];
  const maxNum = nums[nums.length - 1];

  if (catQs.length === 1) {
    return `${catName} (${minNum})`;
  }

  const isContiguous = maxNum - minNum + 1 === catQs.length;
  if (isContiguous) {
    return `${catName} (${minNum}~${maxNum})`;
  }

  return `${catName} (${catQs.length}${locale === "zh" ? "题" : "문항"})`;
}

export function formatRecentExamTitle(
  item: { title?: string; titleKo?: string },
  locale: "ko" | "zh" | "bilingual" = "ko"
): string {
  if (locale === "zh") {
    let raw = item.title || item.titleKo || "";
    raw = raw
      .replace(/전체 모의고사/g, "全卷模考")
      .replace(/듣기 집중 연습/g, "听力专项")
      .replace(/독해 집중 연습/g, "阅读专项")
      .replace(/쓰기 집중 연습/g, "书写专项")
      .replace(/오답노트 맞춤 복습 시험/g, "错题本专项重练卷")
      .replace(/HSK (\d)급 공식 기출 모의고사/g, "HSK $1级 官方真题模考")
      .replace(/HSK (\d)급 기출 모의고사/g, "HSK $1级 官方真题")
      .replace(/HSK (\d)급 신출제강요 공식 샘플 시험/g, "HSK $1级 官方新大纲样卷")
      .replace(/\(축소판 (\d+)문항\)/g, "（精简版 $1 题）")
      .replace(/(\d+)문항/g, "$1题");
    return raw;
  }

  let raw = item.titleKo || item.title || "";
  raw = raw
    .replace(/HSK (\d)级 官方真题模考/g, "HSK $1급 공식 기출 모의고사")
    .replace(/HSK (\d)级 官方真题/g, "HSK $1급 기출 모의고사")
    .replace(/HSK (\d)级 官方新大纲样卷/g, "HSK $1급 신출제강요 공식 샘플 시험")
    .replace(/（精简版\s*(\d+)\s*题）/g, "(축소판 $1문항)")
    .replace(/全卷模考/g, "전체 모의고사")
    .replace(/听力专项/g, "듣기 집중 연습")
    .replace(/阅读专项/g, "독해 집중 연습")
    .replace(/书写专项/g, "쓰기 집중 연습")
    .replace(/错题本专项重练卷/g, "오답노트 맞춤 복습 시험")
    .replace(/（共\s*(\d+)\s*题）/g, "(총 $1문항)")
    .replace(/(\d+)\s*题/g, "$1문항");
  return raw;
}
