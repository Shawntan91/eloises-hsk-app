import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/server/auth";

/**
 * 口语工作室鉴权：复用 HSK 账号登录（hsk_session）。
 * 注册已关闭，账号由管理员直接建库；登录即代表已授权。
 * 旧的 ORAL_ACCESS_PASSCODE 口令制已废弃（2026-11-22），不再使用。
 */
export function isOralAuthRequired(): boolean {
  return true;
}

export function isOralRequestAuthorized(req: NextRequest): boolean {
  return getSessionUser(req) !== null;
}
