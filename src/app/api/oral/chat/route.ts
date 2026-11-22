import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { isOralRequestAuthorized } from "@/lib/oral/auth";
import { buildRoleplaySystemPrompt } from "@/lib/oral/prompts";
import { getOralScenarioById } from "@/data/oralScenarios";
import { generateOralStructuredJson, LlmServiceError } from "@/lib/oral/textLlm";
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
  customTopic?: string;
}

export async function POST(req: NextRequest) {
  if (!isOralRequestAuthorized(req)) {
    return NextResponse.json(
      { error: "unauthorized", message: "请先登录 HSK 账号后再使用生活口语模块。" },
      { status: 401 }
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

    const prevCompleted = Array.isArray(body.completedGoalIds)
      ? body.completedGoalIds
      : [];

    const systemInstruction = buildRoleplaySystemPrompt({
      scenarioTitleZh: scenario.titleZh,
      scenarioTitleKo: scenario.titleKo,
      personaZh: scenario.personaZh,
      goals: scenario.goals,
      completedGoalIds: prevCompleted,
      isFreeTalk: scenario.isFreeTalk,
      customTopic: body.customTopic,
    });

    const llmMessages = [
      ...(Array.isArray(body.history) ? body.history : []).map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        text: m.text,
      })),
      { role: "user" as const, text: userMessage },
    ];

    const { data: parsed, provider, model } =
      await generateOralStructuredJson<OralChatResponse>({
        systemInstruction,
        messages: llmMessages,
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
      });

    const validGoalIds = new Set(scenario.goals.map((g) => g.id));
    const mergedGoalIds = Array.from(
      new Set([
        ...prevCompleted.filter((id) => validGoalIds.has(id)),
        ...(Array.isArray(parsed.completedGoalIds)
          ? parsed.completedGoalIds.filter((id) => validGoalIds.has(id))
          : []),
      ])
    );

    const normalizedFeedback =
      parsed.feedback &&
      typeof parsed.feedback.naturalZh === "string" &&
      parsed.feedback.naturalZh.trim()
        ? {
            userSaid: parsed.feedback.userSaid || userMessage,
            naturalZh: parsed.feedback.naturalZh.trim(),
            explanationKo: parsed.feedback.explanationKo || "",
          }
        : null;

    const payload: OralChatResponse = {
      replyZh: parsed.replyZh || "好嘞，没问题！",
      replyKo: parsed.replyKo || "네, 문제없어요!",
      feedback: normalizedFeedback,
      completedGoalIds: scenario.isFreeTalk ? [] : mergedGoalIds,
      isMissionComplete: scenario.isFreeTalk
        ? false
        : Boolean(parsed.isMissionComplete) ||
          (scenario.goals.length > 0 &&
            mergedGoalIds.length >= scenario.goals.length),
      nextHintKo: parsed.nextHintKo || "",
    };

    return NextResponse.json(payload, {
      headers: { "X-Oral-LLM": `${provider}:${model}` },
    });
  } catch (err: unknown) {
    console.error("[/api/oral/chat] error:", err);
    const status = err instanceof LlmServiceError ? err.status : 500;
    const msg = err instanceof Error ? err.message : "AI 对话服务异常";
    return NextResponse.json(
      { error: status === 503 ? "service_overloaded" : "chat_error", message: msg },
      { status }
    );
  }
}
