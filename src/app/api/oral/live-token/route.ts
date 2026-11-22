import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { isOralRequestAuthorized } from "@/lib/oral/auth";
import { getOralScenarioById } from "@/data/oralScenarios";
import { buildLiveVoiceSystemPrompt } from "@/lib/oral/prompts";

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
    const body = await req.json().catch(() => ({}));
    const scenarioId = typeof body?.scenarioId === "string" ? body.scenarioId : "";
    const customTopic = typeof body?.customTopic === "string" ? body.customTopic : undefined;
    const scenario = getOralScenarioById(scenarioId);

    if (!scenario) {
      return NextResponse.json(
        { error: "not_found", message: "未找到对应的生活场景。" },
        { status: 404 }
      );
    }

    const liveModel = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";
    const systemInstruction = buildLiveVoiceSystemPrompt({
      scenarioTitleZh: scenario.titleZh,
      personaZh: scenario.personaZh,
      goals: scenario.goals,
      isFreeTalk: scenario.isFreeTalk,
      customTopic,
    });

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1beta" },
    });

    const expireTime = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    const authToken = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: liveModel,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        },
      },
    });

    if (!authToken?.name) {
      throw new Error("Failed to mint ephemeral auth token");
    }

    return NextResponse.json({
      token: authToken.name,
      model: liveModel,
    });
  } catch (err: unknown) {
    console.error("[/api/oral/live-token] error:", err);
    const msg = err instanceof Error ? err.message : "Failed to create live token";
    return NextResponse.json(
      { error: "live_token_error", message: msg },
      { status: 500 }
    );
  }
}
