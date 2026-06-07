import type { NextAuthConfig } from "next-auth";

import type { Role } from "@/generated/prisma/enums";

// Edge-safe Auth.js config. This file is imported by the proxy/middleware-adjacent
// edge runtime AND by the Node `auth.ts`, so it must NOT import Prisma or bcryptjs
// (both Node-only). The Credentials provider with its DB lookup lives in `auth.ts`.
export const authConfig = {
  pages: {
    signIn: "/auth/signin",
  },
  session: { strategy: "jwt" },
  // Providers are added in the Node `auth.ts` (Credentials needs Prisma + bcrypt).
  providers: [],
  callbacks: {
    // Stamp `id` + `role` onto the JWT at sign-in, then keep them on every refresh.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    // Expose `id` + `role` to server components / API routes via `auth()`.
    // `token` fields are typed `unknown` (JWT extends Record<string, unknown>),
    // so narrow them to the shapes the `jwt` callback above always stamps.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
