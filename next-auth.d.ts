import type { DefaultSession } from "next-auth";

import type { Role } from "@/generated/prisma/enums";

// Augment Auth.js types so `session.user.id` + `role` are strongly typed (no `any`,
// per coding standards). `id` is non-optional because the Credentials provider
// always returns a persisted user.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
