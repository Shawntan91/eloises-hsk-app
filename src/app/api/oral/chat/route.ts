import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { isOralRequestAuthorized } from "@/lib/oral/auth";
import { buildRoleplaySystemPrompt } from "@/lib/oral/prompts";
import { getOralScenarioById } from "@/data/oralScenarios";
import { OralChatResponse } from "@/types/oral";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    replyZh: {
      type: Type.STRING,
      description: "AI partner's natural spoken Chinese reply (no pinyin)",
    },
    replyKo: {
      type: Type.STRING,
      description: "Natural Korean translation of replyZh",
    },
    feedback: {
      type: Type.OBJECT,
      nullable: true,
      description: "Gentle expression upgrade feedback, or null if already natural",
      properties: {
        userSaid: { type: Type.STRING },
        naturalZh: { type: Type.STRING },
        explanationKo: { type: Type.STRING },
      },
      required: ["userSaid", "naturalZh", "explanationKo"],
    },
    completedGoalIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Cumulative list of completed goal IDs",
    },
    isMissionComplete: {
      type: Type.BOOLEAN,
      description: "True when all scenario goals have been completed",
    },
    nextHintKo: {
      type: Type.STRING,
      description: "Short Korean hint for what Eloise can say next",
    },
  },
  required: [
    "replyZh",
    "replyKo",
    "completedGoalIds",
    "isMissionComplete",
    "nextHintKo",
  ],
};

interface ChatRequestBody {
  scenarioId: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  userMessage: string;
  completedGoalIds?: string[];
}

export async function POST(req: NextRequest) {
  if (!isOralRequestAuthorized(req)) {
    return NextResponse.json(
      { error: "unauthorized", message: "请先输入口令解锁生活口语模块。" },
      { status: 401 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "missing_gemini_key",
        message: "服务端未配置 GEMINI_API_KEY。",
      },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as ChatRequestBody;
    const scenario = getOralScenarioById(body.scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: "not_found", message: "未找到对应的生活场景。" },
        { status: 404 }
      );
    }

    const userMessage = (body.userMessage || "").trim();
    if (!userMessage) {
      return NextResponse.json(
        { error: "bad_request", message: "请输入或说出内容后再发送。" },
        { status: 400 }
      );
    }

    const systemInstruction = buildRoleplaySystemPrompt({
      scenarioTitleZh: scenario.titleZh,
      scenarioTitleKo: scenario.titleKo,
      personaZh: scenario.personaZh,
      goals: scenario.goals,
      completedGoalIds: body.completedGoalIds || [],
    });

    const contents = [
      ...(Array.isArray(body.history) ? body.history : []).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
    ];

    const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
      },
    });

    const rawText = response.text || "";
    const parsed = JSON.parse(rawText) as OralChatResponse;

    return NextResponse.json({
      replyZh: parsed.replyZh || "好嘞，没问题！",
      replyKo: parsed.replyKo || "네, 문제없어요!",
      feedback: parsed.feedback || null,
      completedGoalIds: Array.isArray(parsed.completedGoalIds)
        ? parsed.completedGoalIds
        : body.completedGoalIds || [],
      isMissionComplete: Boolean(parsed.isMissionComplete),
      nextHintKo: parsed.nextHintKo || "",
    } satisfies OralChatResponse);
  } catch (err: unknown) {
    console.error("[/api/oral/chat] error:", err);
    const msg = err instanceof Error ? err.message : "AI 对话服务异常";
    return NextResponse.json(
      { error: "chat_error", message: msg },
      { status: 500 }
    );
  }
}
