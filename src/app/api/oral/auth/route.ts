import { NextRequest, NextResponse } from "next/server";
import {
  ORAL_COOKIE_NAME,
  createOralSessionToken,
  isOralAuthRequired,
  isOralRequestAuthorized,
  verifyPasscodeInput,
} from "@/lib/oral/auth";

export async function GET(req: NextRequest) {
  const authRequired = isOralAuthRequired();
  const authorized = isOralRequestAuthorized(req);
  return NextResponse.json({
    authRequired,
    authorized,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";

    if (!isOralAuthRequired()) {
      return NextResponse.json({ authorized: true });
    }

    if (!passcode || !verifyPasscodeInput(passcode)) {
      return NextResponse.json(
        {
          authorized: false,
          error: "invalid_passcode",
          message: "접속 암호가 올바르지 않습니다. (口令不正确)",
        },
        { status: 401 }
      );
    }

    const token = createOralSessionToken();
    const res = NextResponse.json({ authorized: true });
    res.cookies.set({
      name: ORAL_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Invalid request" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ authorized: false });
  res.cookies.set({
    name: ORAL_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
