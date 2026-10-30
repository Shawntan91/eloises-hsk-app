import { Exam, ExamResult, QuestionDetailResult, SectionScore } from "@/types/exam";

export function normalizeSentence(str: string): string {
  // Strip spaces and all Chinese/English punctuation for fair comparison
  return (str || "")
    .replace(/[\s\u3000\u3001\u3002\uff0c\uff01\uff1f\uff1b\uff1a\u201c\u201d\u2018\u2019\u3008\u3009\u300a\u300b,.!?:;'"\-–—~·]/g, "")
    .toLowerCase();
}

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
    const userAns = answers[q.id]?.trim() || "";
    const isUnanswered = !userAns || userAns.length === 0;
    if (!isUnanswered) totalAnswered++;

    let isCorrect = false;
    let effectiveAns = (q.officialAnswer || "").trim();

    if (q.type === "order_words") {
      // 连词成句
      effectiveAns = q.standardSentence || q.officialAnswer || "";
      const cleanUser = normalizeSentence(userAns);
      const cleanStd = normalizeSentence(effectiveAns);
      isCorrect = !isUnanswered && cleanUser.length > 0 && cleanUser === cleanStd;
    } else if (q.type === "image_writing") {
      // 看图造句 / 短文写作
      effectiveAns = q.referenceEssay || q.standardSentence || q.officialAnswer || "（参考范文）";
      if (!isUnanswered) {
        const req = (q.requiredWord || "").trim();
        if (!req) {
          isCorrect = userAns.length >= 8;
        } else {
          const reqWords = req.split(/\s+/).filter(Boolean);
          // 只要包含了指定词汇并且长度合规即算合格得分
          const containsReq = reqWords.some((w) => userAns.includes(w));
          isCorrect = containsReq && userAns.length >= 6;
        }
      }
    } else {
      // Choice questions
      const officialClean = effectiveAns.toUpperCase();
      isCorrect = !isUnanswered && userAns.toUpperCase() === officialClean;
    }

    if (isCorrect) totalCorrect++;

    const cat = q.partCategory || "阅读";
    if (categories[cat]) {
      categories[cat].total++;
      if (isCorrect) categories[cat].correct++;
    }

    details.push({
      question: q,
      userAnswer: userAns,
      effectiveAnswer: effectiveAns,
      isCorrect,
      isUnanswered,
      pointsEarned: isCorrect ? 1 : 0,
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
