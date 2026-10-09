import { Question } from "./question";

export type AnswerMode = "official" | "practice";

export interface ExamSettings {
  title: string;
  questionCount: number;
  durationMinutes: number;
  allowPrev: boolean;
  allowMark: boolean;
  autoSubmit: boolean;
  answerMode: AnswerMode;
  layoutMode?: "hsk" | "ielts";
}

export interface Exam {
  id: string;
  level: number; // 4 or 5
  title: string;
  titleKo?: string;
  subTitle?: string;
  subTitleKo?: string;
  tag?: string;
  tagKo?: string;
  questions: Question[];
  duration: number; // in seconds
  startTime?: number; // timestamp in ms
  submittedAt?: number;
  answers: Record<string, string>; // questionId -> "A"
  markedQuestions: string[];
  currentQuestion: number;
  status: "ready" | "in_progress" | "submitted";
  answerMode: AnswerMode;
  settings?: ExamSettings;
  audioUrl?: string;
  audioFileName?: string;
}

export interface QuestionDetailResult {
  question: Question;
  userAnswer?: string;
  effectiveAnswer?: string;
  isCorrect: boolean;
  isUnanswered: boolean;
  pointsEarned: number;
  maxPoints: number;
}

export interface SectionScore {
  partCategory: "听力" | "阅读" | "书写";
  partCategoryKo: string;
  total: number;
  correct: number;
  score: number;
  maxScore: number;
}

export interface ExamResult {
  examId: string;
  level: number;
  title: string;
  titleKo?: string;
  score: number;
  totalScore: number;
  isPassed: boolean; // >= 180 is passed for HSK 4/5 (full score 300)
  accuracyRate: number;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  timeSpentSeconds: number;
  avgSecondsPerQuestion: number;
  answerMode: AnswerMode;
  sectionScores: SectionScore[];
  questionDetails: QuestionDetailResult[];
}
