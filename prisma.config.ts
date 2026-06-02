import { defineConfig, env } from "prisma/config";

// Prisma 7 no longer auto-loads .env files. The Neon connection string lives in
// .env.local (gitignored); load it for CLI commands (migrate/generate/studio).
// In CI/production the variables come from the platform environment instead, so a
// missing file is not an error.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local present — rely on the ambient environment.
}

// Migrations must run over a direct (non-pooled) connection on Neon. Prefer a
// direct URL when one is provided; otherwise fall back to DATABASE_URL.
const migrationUrl =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? env("DATABASE_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: migrationUrl,
  },
});
