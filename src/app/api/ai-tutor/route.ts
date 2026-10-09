import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type = "question", // "question" | "word"
      question,
      word,
      userAnswer,
      messages = [],
      userConfig,
      action = "evaluate", // "init" | "evaluate" | "ask"
    } = body;

    // Check user API configuration
    const apiKey =
      userConfig?.apiKey?.trim() ||
      process.env.AI_API_KEY ||
      process.env.ANTIGRAVITY_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    const baseUrl =
      userConfig?.baseUrl?.trim() ||
      process.env.AI_BASE_URL ||
      (apiKey && apiKey.startsWith("AIzaSy")
        ? "https://generativelanguage.googleapis.com/v1beta/openai"
        : "https://api.openai.com/v1");

    const model =
      userConfig?.model?.trim() ||
      process.env.AI_MODEL ||
      (baseUrl.includes("generativelanguage") ? "gemini-2.5-flash" : "gpt-4o-mini");

    // Offline heuristic fallback if no API key configured
    if (!apiKey) {
      if (type === "word") {
        return NextResponse.json({
          reply: generateHeuristicWordTutorReply(word, messages[messages.length - 1]?.content || ""),
          isSimulated: true,
          needConfig: true,
        });
      } else {
        return NextResponse.json({
          ...generateHeuristicQuestionTutorReply(question, userAnswer, action),
          isSimulated: true,
          needConfig: true,
        });
      }
    }

    // Build system prompt based on type
    let systemPrompt = "";
    if (type === "word") {
      systemPrompt = `당신은 한국인 수험생 Eloise(엘로이즈)를 1:1 전담 지도하는 HSK 전문 1타 강사 AI입니다.
학습자가 질문하는 HSK 핵심 단어에 대해 친절하고 명쾌하게 한국어로 설명해 주세요.
[답변 구성]:
1. 💡 단어 핵심 뉘앙스 및 한국어 뜻풀이 (한중 뉘앙스 차이 설명)
2. 📝 HSK 시험 고빈도 실전 예문 2개 (한자 + 한어병음 + 자연스러운 한국어 번역)
3. 🔗 필수 어휘 호응(搭配) 3개 (예: 养成 + 习惯, 积累 + 经验)
4. ⚠️ HSK 4/5급 시험 함정 및 유의어 비교 (자주 헷갈리는 유사 어휘 구별법)
항상 친절하고 격려하는 어조로 한국어로 작성하세요.`;
    } else {
      systemPrompt = `당신은 한국인 수험생 Eloise(엘로이즈)를 지도하는 HSK 기출문제 전문 AI 튜터입니다.
수험생의 이해를 돕기 위해 친절한 한국어로 답변해 주세요.
- 문제의 정답 도출 원리와 핵심 어법/어휘 포인트 설명
- 오답 보기들이 왜 오답인지 함정 분석
- Eloise가 궁금해하는 부분에 대해 알기 쉽게 질의응답`;
    }

    let userContext = "";
    if (type === "word" && word) {
      userContext = `【학습 단어 정보】:
- 단어: ${word.word}
- 병음: ${word.pinyin}
- 품사: ${word.pos_display || word.pos}
- 한국어 기본 뜻: ${word.korean}
- 번호: ${word.no}`;
    } else if (question) {
      userContext = `【문제 정보】:
- 문제 내용: ${question.content}
- 영역: ${question.sectionKo || question.section}
- 정답: ${question.officialAnswer}
- 해설: ${question.explanation || question.explanationKo || "없음"}`;
    }

    const apiMessages: any[] = [
      { role: "system", content: `${systemPrompt}\n\n${userContext}` },
    ];

    if (action === "init" && type === "word") {
      apiMessages.push({
        role: "user",
        content: `선생님! HSK 단어 '${word?.word}'(${word?.pinyin})에 대해 실전 예문과 시험에 꼭 나오는 어휘 호응, 유의어 구별 팁을 알려주세요!`,
      });
    } else if (action === "init") {
      apiMessages.push({
        role: "user",
        content: `선생님! 이 HSK 문제의 핵심 출제 의도와 헷갈리는 포인트를 짚어주세요!`,
      });
    } else {
      // Append conversation history
      for (const m of messages) {
        if (m.role === "user" || m.role === "assistant") {
          apiMessages.push({ role: m.role, content: m.content });
        }
      }
    }

    const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
    const fetchUrl = normalizedBase.endsWith("/chat/completions")
      ? normalizedBase
      : `${normalizedBase}/chat/completions`;

    const res = await fetch(fetchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${res.status}`;
      console.warn("AI API call failed, falling back to heuristic:", errMsg);

      if (type === "word") {
        return NextResponse.json({
          reply: generateHeuristicWordTutorReply(word, messages[messages.length - 1]?.content || ""),
          warning: "대형 모델 API 연결이 불안정하여 오프라인 학습 도우미 모드로 자동 전환되었습니다.",
        });
      } else {
        return NextResponse.json({
          ...generateHeuristicQuestionTutorReply(question, userAnswer, action),
          warning: "대형 모델 API 연결이 불안정하여 오프라인 학습 도우미 모드로 자동 전환되었습니다.",
        });
      }
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("AI tutor route error:", err);
    return NextResponse.json({ error: err.message || "AI Tutor 오류" }, { status: 500 });
  }
}

function generateHeuristicWordTutorReply(word: any, userQuery: string): string {
  if (!word) return "단어 정보를 찾을 수 없습니다.";

  return `🎓 **Eloise를 위한 HSK 단어 [${word.word}] 심층 과외 코칭**

1. 💡 **기본 뜻과 뉘앙스**:
- **${word.word}** [${word.pinyin}] (${word.pos_display || word.pos})
- 뜻: **${word.korean}**
- 이 단어는 HSK 4급/5급 듣기 대화와 독해 빈칸 채우기에서 핵심적인 키워드로 출제됩니다.

2. 📝 **HSK 실전 고빈도 예문**:
• **例句 1**: 我们应该养成良好的**${word.word}**。(wǒmen yīnggāi yǎngchéng liánghǎo de ${word.word}.)
  ➔ 우리는 훌륭한 **${word.korean.split(",")[0]}**을(를) 길러야 한다.
• **例句 2**: 经过大家的努力，终于取得了很大的**${word.word}**。(jīngguò dàjiā de nǔlì, zhōngyú qǔdéle hěn dà de ${word.word}.)
  ➔ 모두의 노력 끝에, 마침내 큰 **${word.korean.split(",")[0]}**(을)를 거두었다.

3. 🔗 **HSK 시험 필수 어휘 호응 (搭配)**:
• **培养 / 养成 + ${word.word}** (기르다, 형성하다)
• **符合 / 满足 + ${word.word}** (부합하다, 만족시키다)
• **重视 / 关注 + ${word.word}** (중시하다, 주의를 기울이다)

4. ⚠️ **시험 공략 꿀팁**:
HSK 시험에서는 유사한 한자를 가진 단어와의 혼동 함정이 자주 나옵니다. 단독으로 암기하기보다 동사+목적어의 호응 짝꿍으로 외우면 작문 영역에서도 감점 없이 고득점을 받을 수 있습니다!`;
}

function generateHeuristicQuestionTutorReply(question: any, userAnswer: string, action: string) {
  if (!question) {
    return { reply: "문제 정보를 찾을 수 없습니다." };
  }

  const ans = question.officialAnswer || "A";

  if (action === "init") {
    return {
      reply: `안녕하세요, Eloise 수험생님! 🎓\n\n이 문제는 **[${question.sectionKo || question.section}]** 영역의 핵심 빈출 유형입니다.\n\n📌 **문제 요약**:\n${question.content.slice(0, 150)}...\n\n어떤 부분이 헷갈리시나요? 정답 풀이 과정이나 특정 보기가 궁금하시면 언제든 질문해 주세요!`,
    };
  }

  return {
    reply: `💡 **Eloise를 위한 문항 맞춤 분석**:

이 문제의 공식 표준 정답은 **${ans}** 입니다.

• **핵심 출제 포인트**:
본문(또는 녹음 대본)의 논리적 흐름과 어법 구조를 파악하는 것이 관건입니다.

• **상세 분석**:
${question.explanationKo || question.explanation || "정답 선택지와 문제의 키워드가 직접적으로 상응합니다."}

추가로 문장의 어휘나 문법에 대해 더 궁금한 점이 있으시면 편하게 물어보세요!`,
  };
}
