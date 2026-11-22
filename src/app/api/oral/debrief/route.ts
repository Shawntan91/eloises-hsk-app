import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { isOralRequestAuthorized } from "@/lib/oral/auth";
import { getOralScenarioById } from "@/data/oralScenarios";
import { buildDebriefSystemPrompt } from "@/lib/oral/prompts";
import { generateOralStructuredJson, LlmServiceError } from "@/lib/oral/textLlm";
import { OralDebriefResult } from "@/types/oral";

const DEBRIEF_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    completedGoalIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    summaryKo: {
      type: Type.STRING,
    },
    upgrades: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          userSaid: { type: Type.STRING },
          naturalZh: { type: Type.STRING },
          explanationKo: { type: Type.STRING },
        },
        required: ["userSaid", "naturalZh", "explanationKo"],
      },
    },
    recommendedPhrases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          zh: { type: Type.STRING },
          ko: { type: Type.STRING },
          noteKo: { type: Type.STRING },
        },
        required: ["zh", "ko", "noteKo"],
      },
    },
  },
  required: [
    "completedGoalIds",
    "summaryKo",
    "upgrades",
    "recommendedPhrases",
  ],
};

interface DebriefRequestBody {
  scenarioId: string;
  transcript: Array<{ role: "user" | "assistant"; text: string }>;
}

export async function POST(req: NextRequest) {
  if (!isOralRequestAuthorized(req)) {
    return NextResponse.json(
      { error: "unauthorized", message: "请先登录 HSK 账号后再使用生活口语模块。" },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as DebriefRequestBody;
    const scenario = getOralScenarioById(body.scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: "not_found", message: "未找到对应的生活场景。" },
        { status: 404 }
      );
    }

    const transcript = Array.isArray(body.transcript) ? body.transcript : [];
    if (transcript.length === 0) {
      return NextResponse.json({
        completedGoalIds: [],
        summaryKo:
          "통화 기록이 짧아 분석할 대화가 충분하지 않아요. 다음엔 한두 문장만 더 이야기해 봐요!",
        upgrades: [],
        recommendedPhrases: scenario.quickHints.map((h) => ({
          zh: h.zh,
          ko: h.ko,
          noteKo: "이 상황에서 바로 써먹을 수 있는 핵심 표현이에요.",
        })),
      } satisfies OralDebriefResult);
    }

    const transcriptText = transcript
      .map((t) => `${t.role === "user" ? "Eloise" : "AI"}: ${t.text}`)
      .join("\n");

    const systemInstruction = buildDebriefSystemPrompt({
      scenarioTitleZh: scenario.titleZh,
      scenarioTitleKo: scenario.titleKo,
      goals: scenario.goals,
      transcriptText,
    });

    const { data: parsed, provider, model } =
      await generateOralStructuredJson<OralDebriefResult>({
        systemInstruction,
        messages: [
          {
            role: "user",
            text: "请根据上述语音通话转录，严格按照 JSON 格式输出复盘报告。",
          },
        ],
        responseSchema: DEBRIEF_SCHEMA,
        temperature: 0.4,
      });

    const validGoalIds = new Set(scenario.goals.map((g) => g.id));

    return NextResponse.json(
      {
        completedGoalIds: Array.isArray(parsed.completedGoalIds)
          ? parsed.completedGoalIds.filter((id) => validGoalIds.has(id))
          : [],
        summaryKo:
          parsed.summaryKo ||
          "오늘도 중국어로 용기 내서 잘 대화했어요! 계속 이렇게 조금씩 연습해 봐요.",
        upgrades: Array.isArray(parsed.upgrades) ? parsed.upgrades : [],
        recommendedPhrases: Array.isArray(parsed.recommendedPhrases)
          ? parsed.recommendedPhrases
          : [],
      } satisfies OralDebriefResult,
      {
        headers: { "X-Oral-LLM": `${provider}:${model}` },
      }
    );
  } catch (err: unknown) {
    console.error("[/api/oral/debrief] error:", err);
    const status = err instanceof LlmServiceError ? err.status : 500;
    const msg = err instanceof Error ? err.message : "Debrief failed";
    return NextResponse.json(
      { error: "debrief_error", message: msg },
      { status }
    );
  }
}
