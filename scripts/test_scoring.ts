import { normalizeSentence, calculateExamResult } from "../src/services/scoringService";
import { Exam } from "../src/types/exam";
import { Question } from "../src/types/question";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

console.log("=== Testing scoringService ===");

// 1. Test normalizeSentence
console.log("\n[Test 1: normalizeSentence]");
assert(
  normalizeSentence(" 他  正在   看书。 ") === "他正在看书",
  "normalizeSentence strips whitespace and Chinese period"
);
assert(
  normalizeSentence("He, is. a! student?") === "heisastudent",
  "normalizeSentence strips English punctuations and lowercases"
);
assert(
  normalizeSentence("“你好”！《世界》：——123") === "你好世界123",
  "normalizeSentence strips quotes, brackets, colons, dashes"
);

// 2. Mock Exam Setup
const mockQuestions: Question[] = [
  // 听力 2题
  {
    id: "q1",
    number: 1,
    type: "single_choice",
    partCategory: "听力",
    section: "听力第一部分",
    sectionKo: "1영역 · 듣기",
    content: "听力题1",
    options: { A: "选项A", B: "选项B" },
    officialAnswer: "A",
  },
  {
    id: "q2",
    number: 2,
    type: "single_choice",
    partCategory: "听力",
    section: "听力第一部分",
    sectionKo: "1영역 · 듣기",
    content: "听力题2",
    options: { A: "选项A", B: "选项B" },
    officialAnswer: "B",
  },
  // 阅读 2题
  {
    id: "q3",
    number: 3,
    type: "single_choice",
    partCategory: "阅读",
    section: "阅读第一部分",
    sectionKo: "2영역 · 독해",
    content: "阅读题1",
    options: { A: "选A", B: "选B" },
    officialAnswer: "A",
  },
  {
    id: "q4",
    number: 4,
    type: "single_choice",
    partCategory: "阅读",
    section: "阅读第一部分",
    sectionKo: "2영역 · 독해",
    content: "阅读题2",
    options: { A: "选A", B: "选B" },
    officialAnswer: "B",
  },
  // 书写 2题: 1连词成句 + 1看图写作
  {
    id: "q5",
    number: 5,
    type: "order_words",
    partCategory: "书写",
    section: "书写第一部分",
    sectionKo: "3영역 · 쓰기",
    content: "连词成句",
    options: {},
    standardSentence: "弟弟非常喜欢看动画片。",
    officialAnswer: "弟弟非常喜欢看动画片。",
  },
  {
    id: "q6",
    number: 6,
    type: "image_writing",
    partCategory: "书写",
    section: "书写第二部分",
    sectionKo: "3영역 · 쓰기",
    content: "看图写作",
    options: {},
    requiredWord: "乒乓球",
    referenceEssay: "他们正在操场上打乒乓球，看起来很开心。",
  },
];

const baseExam: Exam = {
  id: "test-exam",
  level: 4,
  title: "测试试卷",
  subTitle: "6题测试",
  tag: "TEST",
  duration: 3600,
  questions: mockQuestions,
  answers: {},
  markedQuestions: [],
  currentQuestion: 0,
  status: "in_progress",
};

// Test 2: Perfect Score
console.log("\n[Test 2: Perfect Score]");
const perfectAnswers = {
  q1: "A",
  q2: "B",
  q3: "A",
  q4: "B",
  q5: "弟弟 非常 喜欢 看 动画片 。", // with spaces and punctuation
  q6: "他们正在开心地打乒乓球。", // contains requiredWord and length >= 6
};

const resultPerfect = calculateExamResult({ ...baseExam, answers: perfectAnswers });
assert(resultPerfect.score === 300, `Earned score should be 300, got ${resultPerfect.score}`);
assert(resultPerfect.isPassed === true, "Should pass when score >= 180");
assert(resultPerfect.accuracyRate === 100, "Accuracy rate should be 100%");
assert(resultPerfect.correctCount === 6, "Correct count should be 6");

// Test 3: Zero Score (all unanswered)
console.log("\n[Test 3: Zero Score]");
const resultZero = calculateExamResult({ ...baseExam, answers: {} });
assert(resultZero.score === 0, `Earned score should be 0, got ${resultZero.score}`);
assert(resultZero.isPassed === false, "Should fail when score = 0");
assert(resultZero.unansweredCount === 6, "Unanswered count should be 6");

// Test 4: Borderline Pass (2/3 correct = 200 / 300 >= 180)
console.log("\n[Test 4: Borderline Pass / Partial Score]");
const partialAnswers = {
  q1: "A", // 听力 1/2 = 50分
  q3: "A", // 阅读 1/2 = 50分
  q4: "B", // 阅读 2/2 = 100分
  q5: "错误的句子", // 书写 0/2 = 0分
};
const resultPartial = calculateExamResult({ ...baseExam, answers: partialAnswers });
// 听力 50 + 阅读 100 + 书写 0 = 150 < 180
assert(resultPartial.score === 150, `Earned score should be 150, got ${resultPartial.score}`);
assert(resultPartial.isPassed === false, "Score 150 should be failed");

// Give correct answer to q2 (听力 2/2 = 100) -> 100 + 100 + 0 = 200 >= 180
const passAnswers = { ...partialAnswers, q2: "B" };
const resultPass = calculateExamResult({ ...baseExam, answers: passAnswers });
assert(resultPass.score === 200, `Earned score should be 200, got ${resultPass.score}`);
assert(resultPass.isPassed === true, "Score 200 should be passed");

console.log("\n==========================================");
console.log("🎉 All 10 unit test assertions passed!");
