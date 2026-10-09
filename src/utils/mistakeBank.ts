"use client";

import { ExamResult } from "../types/exam";
import { Question } from "../types/question";

export interface MistakeItem {
  id: string; // `${examId}_${questionId}`
  examId: string;
  examTitle: string;
  examTitleKo?: string;
  level: number;
  question: Question;
  userAnswer?: string;
  correctAnswer?: string;
  recordedAt: number;
  mastered: boolean;
  notes?: string;
}

const STORAGE_KEY = "eloise_hsk_mistakes";

export function getMistakeBank(): MistakeItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveMistakeBank(items: MistakeItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("mistake-bank-changed"));
  } catch (e) {
    console.error("Failed to save mistake bank", e);
  }
}

export function saveMistakesFromExamResult(result: ExamResult): void {
  if (!result || !result.questionDetails) return;
  const currentBank = getMistakeBank();
  const bankMap = new Map(currentBank.map((item) => [item.id, item]));

  for (const detail of result.questionDetails) {
    if (!detail.isCorrect) {
      const id = `${result.examId}_${detail.question.id}`;
      const existing = bankMap.get(id);

      const newItem: MistakeItem = {
        id,
        examId: result.examId,
        examTitle: result.title,
        examTitleKo: result.titleKo,
        level: result.level,
        question: detail.question,
        userAnswer: detail.userAnswer || "未答 (미답안)",
        correctAnswer: detail.effectiveAnswer || detail.question.officialAnswer || "A",
        recordedAt: existing ? existing.recordedAt : Date.now(),
        mastered: false,
        notes: existing?.notes || "",
      };

      bankMap.set(id, newItem);
    }
  }

  saveMistakeBank(Array.from(bankMap.values()));
}

export function toggleMistakeMastered(id: string): boolean {
  const bank = getMistakeBank();
  const item = bank.find((m) => m.id === id);
  if (!item) return false;
  item.mastered = !item.mastered;
  saveMistakeBank(bank);
  return item.mastered;
}

export function updateMistakeNote(id: string, notes: string): void {
  const bank = getMistakeBank();
  const item = bank.find((m) => m.id === id);
  if (!item) return;
  item.notes = notes;
  saveMistakeBank(bank);
}

export function deleteMistakeItem(id: string): void {
  const bank = getMistakeBank().filter((m) => m.id !== id);
  saveMistakeBank(bank);
}

export function clearAllMistakes(): void {
  saveMistakeBank([]);
}

export function getMistakeStats(): { total: number; unmastered: number; mastered: number } {
  const bank = getMistakeBank();
  const mastered = bank.filter((m) => m.mastered).length;
  return {
    total: bank.length,
    mastered,
    unmastered: bank.length - mastered,
  };
}

export function downloadMistakesAsMarkdown(items: MistakeItem[], title = "Eloise_HSK_오답노트"): void {
  if (typeof window === "undefined" || items.length === 0) return;

  const lines: string[] = [
    `# 📕 ${title}`,
    `> 수험생: Eloise (엘로이즈) | 생성일: ${new Date().toLocaleDateString()} | 총 오답 문항: ${items.length}개\n`,
  ];

  items.forEach((item, idx) => {
    const q = item.question;
    lines.push(`## [${idx + 1}] HSK ${item.level}급 · ${q.sectionKo || q.section}`);
    lines.push(`- **출처 (来源)**: ${item.examTitleKo || item.examTitle}`);
    lines.push(`- **문제 내용 (题目)**:\n${q.content}\n`);
    if (q.options) {
      lines.push(`- **선택지 (选项)**:`);
      for (const [k, v] of Object.entries(q.options)) {
        const isUser = item.userAnswer === k;
        const isCor = item.correctAnswer === k;
        const mark = isCor ? "✅ [정답]" : isUser ? "❌ [내 답]" : "";
        lines.push(`  - **${k}**. ${v} ${mark}`);
      }
    }
    lines.push(`\n- **내 제출 답안**: \`${item.userAnswer}\``);
    lines.push(`- **공식 표준 정답**: \`${item.correctAnswer}\``);
    if (q.explanationKo) {
      lines.push(`\n### 💡 한국어 심층 해설 (한국어 풀이):\n${q.explanationKo}`);
    }
    if (item.notes) {
      lines.push(`\n### 📝 Eloise의 학습 메모:\n> ${item.notes}`);
    }
    lines.push("\n---\n");
  });

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
