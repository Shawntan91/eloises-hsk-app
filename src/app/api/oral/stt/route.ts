import { NextRequest, NextResponse } from "next/server";
import { isOralRequestAuthorized } from "@/lib/oral/auth";

export async function POST(req: NextRequest) {
  if (!isOralRequestAuthorized(req)) {
    return NextResponse.json(
      { error: "unauthorized", message: "请先输入口令解锁生活口语模块。" },
      { status: 401 }
    );
  }

  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (!groqApiKey) {
    return NextResponse.json(
      {
        error: "missing_groq_key",
        message: "服务端未配置 GROQ_API_KEY，暂无法进行语音识别。",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("file");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "bad_request", message: "未收到有效音频文件。" },
        { status: 400 }
      );
    }

    if (audioFile.size > 12 * 1024 * 1024) {
      return NextResponse.json(
        { error: "file_too_large", message: "录音文件过大，请控制在 12MB 以内。" },
        { status: 400 }
      );
    }

    const rawName = (audioFile as File).name || "recording.webm";
    const upstreamForm = new FormData();
    upstreamForm.append("file", audioFile, rawName);
    upstreamForm.append("model", "whisper-large-v3-turbo");
    // Prompt allows Chinese-Korean code-switching without locking to pure Chinese
    upstreamForm.append(
      "prompt",
      "中文日常口语对话，说话人可能夹杂少量韩语词汇。"
    );
    upstreamForm.append("response_format", "json");

    const upstreamRes = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: upstreamForm,
      }
    );

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => "");
      return NextResponse.json(
        {
          error: "stt_upstream_error",
          message: "语音识别服务暂时异常，请重试或改用文字输入。",
          detail: errText.slice(0, 200),
        },
        { status: upstreamRes.status }
      );
    }

    const data = await upstreamRes.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "STT failed";
    return NextResponse.json(
      { error: "stt_error", message: msg },
      { status: 500 }
    );
  }
}
