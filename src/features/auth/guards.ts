import { redirect } from "next/navigation";

import type { Role } from "@/generated/prisma/enums";

import { auth } from "./auth";

export type AuthedUser = {
  id: string;
  role: Role;
};

// Authorization helpers built on `auth()`. Enforced at the service/page layer —
// NOT in proxy.ts (Prisma can't run on edge). Use these in server components,
// server actions, and route handlers.

/**
 * Returns the current session user or redirects anonymous requests to sign-in.
 * For use in pages / server components where a redirect is the right UX.
 */
export async function requireUser(callbackUrl?: string): Promise<AuthedUser> {
  const session = await auth();
  if (!session?.user) {
    const target = callbackUrl
      ? `/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/signin";
    redirect(target);
  }
  return { id: session.user.id, role: session.user.role };
}

/**
 * Like {@link requireUser} but additionally requires the ADMIN role. Non-admins
 * are sent home rather than to sign-in (they are authenticated, just unauthorized).
 */
export async function requireAdmin(callbackUrl?: string): Promise<AuthedUser> {
  const user = await requireUser(callbackUrl);
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  return user;
}

/**
 * Non-redirecting variant for API route handlers that must return JSON status
 * codes (e.g. 401) rather than HTTP redirects. Returns null when anonymous.
 */
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  return { id: session.user.id, role: session.user.role };
}
