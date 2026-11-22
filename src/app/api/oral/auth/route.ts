import { NextRequest, NextResponse } from "next/server";
import { isOralAuthRequired, isOralRequestAuthorized } from "@/lib/oral/auth";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    authRequired: isOralAuthRequired(),
    authorized: isOralRequestAuthorized(req),
  });
}

export async function POST(req: NextRequest) {
  // 口令制已废弃：POST 不再验证口令、不再发口令会话，只返回当前登录状态（兼容旧客户端）。
  return NextResponse.json({
    authorized: isOralRequestAuthorized(req),
  });
}

export async function DELETE() {
  return NextResponse.json({ authorized: false });
}
