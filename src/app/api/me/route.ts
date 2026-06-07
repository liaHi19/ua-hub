import { NextResponse } from "next/server";

import { getAuthedUser } from "@/features/auth/guards";

// Minimal guarded surface proving the session works end-to-end:
// 401 for anonymous requests; { id, role } for authenticated ones.
// Real protected pages arrive in later sessions.
export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ id: user.id, role: user.role });
}
