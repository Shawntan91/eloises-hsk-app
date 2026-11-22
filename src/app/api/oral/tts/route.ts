import { NextRequest, NextResponse } from "next/server";
import { isOralRequestAuthorized } from "@/lib/oral/auth";
import { getTTSProvider } from "@/lib/oral/ttsProvider";

export async function POST(req: NextRequest) {
  if (!isOralRequestAuthorized(req)) {
    return NextResponse.json(
      { error: "unauthorized", message: "请先输入口令解锁生活口语模块。" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const voice = typeof body?.voice === "string" ? body.voice : undefined;
    const rate = typeof body?.rate === "number" ? body.rate : 1.0;

    if (!text) {
      return NextResponse.json(
        { error: "bad_request", message: "TTS 文本不能为空。" },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { error: "bad_request", message: "单次合成文本过长。" },
        { status: 400 }
      );
    }

    const provider = getTTSProvider();
    const { audioBuffer, contentType } = await provider.synthesize({
      text,
      voice,
      rate,
    });

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: unknown) {
    console.error("[/api/oral/tts] error:", err);
    const msg = err instanceof Error ? err.message : "TTS synthesis failed";
    return NextResponse.json(
      { error: "tts_error", message: msg },
      { status: 502 }
    );
  }
}
