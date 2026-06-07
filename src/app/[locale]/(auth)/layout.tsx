import type { ReactNode } from "react";

// Shared chrome for the (auth) route group. The group is URL-invisible, so these
// pages resolve at /[locale]/signin and /[locale]/register (no /auth/ segment).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
      {children}
    </main>
  );
}
