import crypto from "crypto";
import { NextRequest } from "next/server";

export const ORAL_COOKIE_NAME = "eloise_oral_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

function getPasscode(): string {
  return (process.env.ORAL_ACCESS_PASSCODE || "").trim();
}

function getSigningSecret(): string {
  const passcode = getPasscode();
  // Derive deterministic HMAC secret from passcode + optional server salt
  return crypto
    .createHash("sha256")
    .update(`eloise-oral-studio::${passcode || "dev-no-passcode"}`)
    .digest("hex");
}

export function isOralAuthRequired(): boolean {
  const passcode = getPasscode();
  if (process.env.NODE_ENV === "development" && !passcode) {
    return false;
  }
  return true;
}

export function verifyPasscodeInput(input: string): boolean {
  const expected = getPasscode();
  if (!expected) {
    return process.env.NODE_ENV === "development";
  }
  const a = Buffer.from(input.trim(), "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createOralSessionToken(): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `oral_v1.${exp}`;
  const sig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifyOralSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [prefix, expStr, sig] = parts;
  if (prefix !== "oral_v1") return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const payload = `${prefix}.${expStr}`;
  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex");

  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function isOralRequestAuthorized(req: NextRequest): boolean {
  if (!isOralAuthRequired()) {
    return true;
  }
  const token = req.cookies.get(ORAL_COOKIE_NAME)?.value;
  return verifyOralSessionToken(token);
}
