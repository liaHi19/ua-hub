import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 connects through a driver adapter rather than a datasource URL in the
// schema. Next.js loads .env.local into process.env, so DATABASE_URL is the
// pooled Neon connection string used at runtime.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local (Neon pooled connection string).");
}

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

// Reuse a single client across hot reloads in development to avoid exhausting
// Neon's connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
