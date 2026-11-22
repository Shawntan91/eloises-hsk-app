import { NextRequest, NextResponse } from 'next/server';
import { allowRegister, getSessionUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = getSessionUser(req);
  return NextResponse.json({ user: user ?? null, allowRegister: allowRegister() });
}
