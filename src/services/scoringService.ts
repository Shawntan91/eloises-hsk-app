import { Exam, ExamResult, QuestionDetailResult, SectionScore } from "@/types/exam";

export function calculateExamResult(exam: Exam): ExamResult {
  const questions = exam.questions;
  const answers = exam.answers || {};

  // Group by category: 听力 / 阅读 / 书写
  const categories: Record<"听力" | "阅读" | "书写", { total: number; correct: number }> = {
    听力: { total: 0, correct: 0 },
    阅读: { total: 0, correct: 0 },
    书写: { total: 0, correct: 0 },
  };

  const details: QuestionDetailResult[] = [];
  let totalCorrect = 0;
  let totalAnswered = 0;

  for (const q of questions) {
    const userAns = answers[q.id]?.trim();
    const isUnanswered = !userAns || userAns.length === 0;
    if (!isUnanswered) totalAnswered++;

    const officialAns = (q.officialAnswer || "").trim().toUpperCase();
    const isCorrect = !isUnanswered && userAns.toUpperCase() === officialAns;

    if (isCorrect) totalCorrect++;

    const cat = q.partCategory || "阅读";
    if (categories[cat]) {
      categories[cat].total++;
      if (isCorrect) categories[cat].correct++;
    }

    details.push({
      question: q,
      userAnswer: userAns,
      effectiveAnswer: officialAns,
      isCorrect,
      isUnanswered,
      pointsEarned: isCorrect ? 1 : 0, // normalized later
      maxPoints: 1,
    });
  }

  // Calculate HSK Section Scores (Max 100 per section, Total 300)
  const sectionScores: SectionScore[] = (["听力", "阅读", "书写"] as const).map((cat) => {
    const catData = categories[cat];
    const catTotal = catData.total;
    const catCorrect = catData.correct;
    const score = catTotal > 0 ? Math.round((catCorrect / catTotal) * 100) : 0;
    const catKo =
      cat === "听力" ? "듣기 (Listening)" : cat === "阅读" ? "독해 (Reading)" : "쓰기 (Writing)";

    return {
      partCategory: cat,
      partCategoryKo: catKo,
      total: catTotal,
      correct: catCorrect,
      score,
      maxScore: 100,
    };
  });

  const totalScore = sectionScores.reduce((sum, s) => sum + s.score, 0);
  const isPassed = totalScore >= 180;
  const accuracyRate = questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0;

  const elapsed = exam.startTime ? Math.floor((Date.now() - exam.startTime) / 1000) : 0;
  const timeSpentSeconds = Math.min(exam.duration, Math.max(1, elapsed));
  const avgSeconds = totalAnswered > 0 ? Math.round(timeSpentSeconds / totalAnswered) : 0;

  return {
    examId: exam.id,
    level: exam.level || 4,
    title: exam.title,
    titleKo: exam.titleKo,
    score: totalScore,
    totalScore: 300,
    isPassed,
    accuracyRate,
    totalQuestions: questions.length,
    answeredCount: totalAnswered,
    correctCount: totalCorrect,
    wrongCount: totalAnswered - totalCorrect,
    unansweredCount: questions.length - totalAnswered,
    timeSpentSeconds,
    avgSecondsPerQuestion: avgSeconds,
    answerMode: exam.answerMode || "official",
    sectionScores,
    questionDetails: details,
  };
}
