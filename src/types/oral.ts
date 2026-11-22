export type OralMode = "shadowing" | "roleplay" | "live";

export type OralDifficulty = "HSK 4" | "HSK 4-5" | "HSK 5";

export type OralCategory =
  | "food_shopping"
  | "travel_stay"
  | "daily_errands"
  | "social_work";

export interface OralGoal {
  id: string;
  zh: string;
  ko: string;
}

export interface OralScriptLine {
  id: string;
  speaker: "partner" | "user";
  speakerLabelZh: string;
  speakerLabelKo: string;
  zh: string;
  pinyin: string;
  ko: string;
  tipKo?: string;
}

export interface OralQuickHint {
  zh: string;
  pinyin: string;
  ko: string;
}

export interface OralScenario {
  id: string;
  category?: OralCategory;
  isFreeTalk?: boolean;
  titleZh: string;
  titleKo: string;
  descZh: string;
  descKo: string;
  difficulty: OralDifficulty;
  icon: string;
  voiceName: string; // Default Edge TTS voice for the AI partner
  personaZh: string;
  personaRoleKo: string;
  openingZh: string;
  openingKo: string;
  goals: OralGoal[];
  script: OralScriptLine[];
  quickHints: OralQuickHint[];
}

export interface OralFeedback {
  userSaid: string;
  naturalZh: string;
  explanationKo: string;
}

export interface OralChatMessage {
  id: string;
  role: "user" | "assistant";
  textZh: string;
  textKo?: string;
  feedback?: OralFeedback | null;
  timestamp: number;
}

export interface OralChatResponse {
  replyZh: string;
  replyKo: string;
  feedback: OralFeedback | null;
  completedGoalIds: string[];
  isMissionComplete: boolean;
  nextHintKo: string;
}

export interface OralPhraseItem {
  id: string;
  zh: string;
  pinyin?: string;
  ko: string;
  noteKo?: string;
  scenarioId?: string;
  scenarioTitleZh?: string;
  scenarioTitleKo?: string;
  source: "shadowing" | "roleplay" | "feedback" | "debrief";
  mastered: boolean;
  createdAt: number;
  // Optional SM-2 Spaced Repetition fields
  interval?: number;
  repetitions?: number;
  easiness?: number;
  nextReviewAt?: number;
  lastReviewedAt?: number;
}

export interface OralScenarioProgress {
  scenarioId: string;
  completedGoalIds: string[];
  completedCount: number;
  lastPracticedAt: number;
}

// Phase 2 Extension Types (Live Audio + Debrief)
export interface OralDebriefResult {
  completedGoalIds: string[];
  summaryKo: string;
  upgrades: OralFeedback[];
  recommendedPhrases: Array<{
    zh: string;
    ko: string;
    noteKo: string;
  }>;
}
