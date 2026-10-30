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

      const effectiveAns =
        detail.effectiveAnswer ||
        detail.question.standardSentence ||
        detail.question.referenceEssay ||
        detail.question.officialAnswer ||
        "A";

      const newItem: MistakeItem = {
        id,
        examId: result.examId,
        examTitle: result.title,
        examTitleKo: result.titleKo,
        level: result.level,
        question: detail.question,
        userAnswer: detail.userAnswer || "未答 (미답안)",
        correctAnswer: effectiveAns,
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

export function exportMistakesToMarkdown(items: MistakeItem[], title = "Eloise_HSK_오답노트"): string {
  const lines: string[] = [
    `# 📕 ${title}`,
    `> 수험생: Eloise (엘로이즈) | 생성일: ${new Date().toLocaleDateString()} | 총 오답 문항: ${items.length}개\n`,
  ];

  items.forEach((item, idx) => {
    const q = item.question;
    lines.push(`## [${idx + 1}] HSK ${item.level}급 · ${q.sectionKo || q.section}`);
    lines.push(`- **출처 (来源)**: ${item.examTitleKo || item.examTitle}`);
    lines.push(`- **문제 내용 (题目)**:\n${q.content}\n`);
    if (q.options && Object.keys(q.options).length > 0) {
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

  return lines.join("\n");
}

export function downloadMistakesAsMarkdown(items: MistakeItem[], title = "Eloise_HSK_오답노트"): void {
  if (typeof window === "undefined" || items.length === 0) return;
  const md = exportMistakesToMarkdown(items, title);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadMistakesAsWord(items: MistakeItem[], title = "Eloise_HSK_오답노트"): void {
  if (typeof window === "undefined" || items.length === 0) return;

  const questionsHtml = items
    .map(
      (item, idx) => `
    <div style="margin-bottom: 24px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <div style="font-size: 11pt; color: #64748b; margin-bottom: 8px;">
        <strong style="color: #dc2626;">#${idx + 1}</strong> &nbsp;|&nbsp; 
        <span>HSK ${item.level}급</span> &nbsp;|&nbsp;
        <span>${item.question.sectionKo || item.question.section}</span> &nbsp;|&nbsp;
        <span>출처: ${item.examTitleKo || item.examTitle}</span>
      </div>
      <div style="font-size: 12pt; font-weight: bold; margin-bottom: 12px; color: #0f172a; white-space: pre-line;">
        ${item.question.content}
      </div>
      ${
        item.question.options && Object.keys(item.question.options).length > 0
          ? `<div style="margin-bottom: 12px; font-size: 11pt;">
              ${Object.entries(item.question.options)
                .map(
                  ([k, v]) => `
                <div style="margin: 4px 0; padding: 4px 8px; ${
                  item.correctAnswer?.includes(k)
                    ? "background-color: #ecfdf5; color: #047857; font-weight: bold;"
                    : item.userAnswer?.includes(k)
                    ? "background-color: #fef2f2; color: #b91c1c;"
                    : "color: #334155;"
                }">
                  <strong>${k}.</strong> ${v}
                  ${item.correctAnswer?.includes(k) ? " (정답)" : ""}
                  ${item.userAnswer?.includes(k) && !item.correctAnswer?.includes(k) ? " (내 답안)" : ""}
                </div>`
                )
                .join("")}
            </div>`
          : ""
      }
      <div style="background-color: #f8fafc; border-left: 4px solid #dc2626; padding: 8px 12px; font-size: 10.5pt; margin-top: 8px;">
        <div><strong>내 제출 답안:</strong> <span style="color: #dc2626; font-weight: bold;">${item.userAnswer || "미답안"}</span> &nbsp;&nbsp;|&nbsp;&nbsp; <strong>공식 정답:</strong> <span style="color: #059669; font-weight: bold;">${item.correctAnswer}</span></div>
        ${
          item.question.explanationKo
            ? `<div style="margin-top: 8px; color: #334155; white-space: pre-line;"><strong>【한국어 심층 해설】</strong><br/>${item.question.explanationKo}</div>`
            : ""
        }
      </div>
      ${
        item.notes
          ? `<div style="margin-top: 8px; background-color: #fffbeb; border: 1px dashed #f59e0b; padding: 8px 12px; font-size: 10pt; color: #92400e;">
              <strong>【Eloise의 학습 노트】</strong>: ${item.notes}
            </div>`
          : ""
      }
    </div>
  `
    )
    .join("");

  const docContent = `
    <!DOCTYPE html>
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <style>
        body { font-family: 'Malgun Gothic', 'Microsoft YaHei', sans-serif; font-size: 11pt; line-height: 1.6; color: #0f172a; margin: 30px; }
        h1 { font-size: 18pt; color: #b91c1c; border-bottom: 2px solid #b91c1c; padding-bottom: 8px; }
        .meta { color: #64748b; font-size: 10pt; margin-bottom: 24px; }
      </style>
    </head>
    <body>
      <h1>📕 ${title}</h1>
      <div class="meta">수험생: Eloise (엘로이즈) | 생성일: ${new Date().toLocaleDateString()} | 총 오답 문항: ${items.length}개</div>
      ${questionsHtml}
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff" + docContent], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printMistakes(items: MistakeItem[], title = "Eloise_HSK_오답노트"): void {
  if (typeof window === "undefined" || items.length === 0) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("인쇄 미리보기를 위해 팝업을 허용해주세요!");
    return;
  }

  const itemsHtml = items
    .map(
      (item, idx) => `
    <div class="question-card">
      <div class="header">
        <span class="num">#${idx + 1}</span>
        <span class="source">HSK ${item.level}급 · 《${item.examTitleKo || item.examTitle}》</span>
        <span class="date">${new Date(item.recordedAt).toLocaleDateString()}</span>
      </div>
      <div class="stem">${idx + 1}. ${item.question.content}</div>
      ${
        item.question.options && Object.keys(item.question.options).length > 0
          ? `<div class="options">
              ${Object.entries(item.question.options)
                .map(
                  ([k, v]) => `
                <div class="option ${item.correctAnswer?.includes(k) ? "correct" : ""} ${
                    item.userAnswer?.includes(k) && !item.correctAnswer?.includes(k) ? "wrong" : ""
                  }">
                  <strong>${k}.</strong> ${v}
                </div>`
                )
                .join("")}
            </div>`
          : ""
      }
      <div class="analysis-box">
        <div><strong>내 답안:</strong> <span class="user-ans">${item.userAnswer || "미답안"}</span> &nbsp;&nbsp;|&nbsp;&nbsp; <strong>정답:</strong> <span class="correct-ans">${item.correctAnswer}</span></div>
        ${
          item.question.explanationKo
            ? `<div class="expl"><strong>【한국어 해설】</strong> ${item.question.explanationKo}</div>`
            : ""
        }
      </div>
      ${item.notes ? `<div class="note-box"><strong>【나의 메모】</strong> ${item.notes}</div>` : ""}
    </div>
  `
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Malgun Gothic", "Segoe UI", sans-serif; margin: 20px; color: #1e293b; font-size: 13px; line-height: 1.5; }
        h1 { font-size: 20px; font-weight: 800; border-bottom: 2px solid #b91c1c; padding-bottom: 8px; margin-bottom: 4px; color: #b91c1c; }
        .meta { font-size: 11px; color: #64748b; margin-bottom: 20px; }
        .question-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; page-break-inside: avoid; }
        .header { font-size: 10px; color: #64748b; margin-bottom: 6px; display: flex; gap: 8px; font-weight: 600; }
        .header .num { color: #dc2626; font-weight: bold; }
        .stem { font-weight: 700; margin-bottom: 8px; font-size: 13.5px; white-space: pre-line; }
        .options { margin-bottom: 8px; }
        .option { margin: 3px 0; padding: 2px 4px; }
        .option.correct { font-weight: bold; color: #047857; background: #ecfdf5; border-radius: 3px; }
        .option.wrong { color: #b91c1c; text-decoration: line-through; }
        .analysis-box { background: #f8fafc; border-left: 3px solid #dc2626; padding: 6px 8px; font-size: 11.5px; margin-top: 6px; border-radius: 0 4px 4px 0; }
        .user-ans { color: #dc2626; font-weight: bold; }
        .correct-ans { color: #059669; font-weight: bold; }
        .expl { margin-top: 4px; color: #475569; white-space: pre-line; }
        .note-box { background: #fffbeb; border: 1px dashed #f59e0b; padding: 6px 8px; font-size: 11px; margin-top: 6px; border-radius: 4px; color: #92400e; }
        @media print {
          body { margin: 0; }
          .question-card { border-color: #94a3b8; }
        }
      </style>
    </head>
    <body>
      <h1>📕 ${title}</h1>
      <div class="meta">수험생: Eloise (엘로이즈) | 인쇄일시: ${new Date().toLocaleString()} | 수록 문항: 총 ${items.length}개</div>
      ${itemsHtml}
    </body>
    </html>
  `);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
}

export function convertQuestionDetailsToMistakes(
  examId: string,
  examTitle: string,
  level: number,
  details: Array<{
    question: Question;
    userAnswer?: string;
    effectiveAnswer?: string;
    isCorrect: boolean;
  }>
): MistakeItem[] {
  return details.map((d) => ({
    id: `${examId}_${d.question.id}`,
    examId,
    examTitle,
    examTitleKo: examTitle,
    level,
    question: d.question,
    userAnswer: d.userAnswer || "未答 (미답안)",
    correctAnswer:
      d.effectiveAnswer ||
      d.question.standardSentence ||
      d.question.referenceEssay ||
      d.question.officialAnswer ||
      "A",
    recordedAt: Date.now(),
    mastered: false,
    notes: "",
  }));
}
