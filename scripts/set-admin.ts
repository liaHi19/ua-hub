/**
 * Bootstrap / promote the first admin. No public self-elevation path exists, so
 * the owner runs this once from the CLI:
 *
 *   pnpm dlx tsx scripts/set-admin.ts <email> [password]
 *
 * - If the user already exists, their role is set to ADMIN.
 * - If the user does not exist and a password is supplied, a verified ADMIN
 *   account is created (handy for seeding a sign-in-able admin before the
 *   registration UI lands in 03b). Without a password, a missing user is an error.
 */
import bcrypt from "bcryptjs";

// Prisma 7 does not auto-load .env files, and the client reads DATABASE_URL on
// init — load env BEFORE the dynamic import below.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local present — rely on the ambient environment (e.g. CI).
}

const { prisma } = await import("@/lib/prisma");

async function main() {
  const [rawEmail, password] = process.argv.slice(2);
  if (!rawEmail) {
    console.error("Usage: tsx scripts/set-admin.ts <email> [password]");
    process.exit(1);
  }

  const email = rawEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const user = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });
    console.log(`Promoted ${user.email} to ADMIN.`);
    return;
  }

  if (!password) {
    console.error(
      `No user with email ${email}. Pass a password to create a new ADMIN account.`,
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`Created ADMIN account ${user.email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
