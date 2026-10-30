import { NextRequest, NextResponse } from "next/server";

// Sliding window in-memory rate limiter (max 20 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (record.count >= 20) {
    return false;
  }
  record.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Origin verification (Allow same origin or localhost for dev)
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const host = req.headers.get("host") || "";
    const isAllowedOrigin =
      !origin ||
      origin.includes(host) ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("vercel.app");

    if (!isAllowedOrigin) {
      return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
    }

    // 2. IP Rate limiting
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error: "quota",
          message:
            "요청이 너무 많습니다. 본 기능은 전용 API 연동을 사용하고 있으므로 사이트 링크를 외부에 무단 공유하지 말아주시기 바랍니다. 문의 사항은 관리자에게 연락해 주세요. (今日 AI 请求过于频繁，请稍后再试)",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { prompt, imageBase64, messages, userConfig } = body || {};

    // 3. Request size limit
    const promptLen = (prompt || "").length + JSON.stringify(messages || "").length;
    if (promptLen > 25000) {
      return NextResponse.json(
        { error: "bad_request", message: "请求内容过长，请缩短文本后重试。" },
        { status: 400 }
      );
    }

    if (imageBase64 && imageBase64.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "bad_request", message: "图片过大，请压缩至 4MB 以内再上传。" },
        { status: 400 }
      );
    }

    // 4. Determine API Key (Prioritize user custom key, fallback to server environment key)
    const apiKey =
      userConfig?.apiKey?.trim() ||
      process.env.AI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.ANTIGRAVITY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "need_config",
          message: "未配置服务商 AI_API_KEY，您可在设置中填入您自己的 API Key。",
        },
        { status: 200 }
      );
    }

    // 5. Upstream AI Call (Google Gemini / OpenAI compatible)
    if (apiKey.startsWith("AIzaSy") || process.env.AI_PROVIDER === "gemini") {
      // Gemini API
      const parts: any[] = [];
      if (prompt) {
        parts.push({ text: prompt });
      } else if (messages && Array.isArray(messages)) {
        const text = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n\n");
        parts.push({ text });
      }

      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: cleanBase64,
          },
        });
      }

      const model = userConfig?.model || process.env.AI_MODEL || "gemini-2.0-flash";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const upstreamRes = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] }),
      });

      if (upstreamRes.status === 429) {
        return NextResponse.json(
          {
            error: "quota",
            message: "今日 AI 免费额度已达上限，请明天再试或配置个人 API Key。",
          },
          { status: 429 }
        );
      }

      if (!upstreamRes.ok) {
        const errJson = await upstreamRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: "upstream_error",
            message: errJson.error?.message || "AI 接口响应异常",
          },
          { status: upstreamRes.status }
        );
      }

      const data = await upstreamRes.json();
      const textReply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "AI 暂未返回有效内容。";

      return NextResponse.json({ reply: textReply });
    } else {
      // OpenAI-compatible provider (DeepSeek / SiliconFlow / GLM / OpenAI)
      const baseUrl =
        userConfig?.baseUrl || process.env.AI_BASE_URL || "https://api.openai.com/v1";
      const model = userConfig?.model || process.env.AI_MODEL || "gpt-4o-mini";

      const chatMessages = messages || [
        { role: "user", content: prompt || "你好" },
      ];

      const upstreamRes = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
        }),
      });

      if (upstreamRes.status === 429) {
        return NextResponse.json(
          {
            error: "quota",
            message: "今日 AI 免费额度已达上限，请明天再试或配置个人 API Key。",
          },
          { status: 429 }
        );
      }

      const data = await upstreamRes.json();
      const textReply = data.choices?.[0]?.message?.content || "";

      return NextResponse.json({ reply: textReply });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "server_error", message: err.message || "服务器内部错误" },
      { status: 500 }
    );
  }
}
