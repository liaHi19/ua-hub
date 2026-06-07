import { handlers } from "@/features/auth/auth";

// Auth.js route handlers. /api/* is not localized (already excluded by proxy.ts).
export const { GET, POST } = handlers;
