"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { getTranslations } from "next-intl/server";

import { signIn } from "@/features/auth/auth";
import { prisma } from "@/lib/prisma";
import { appBaseUrl, sendEmail } from "@/lib/email";
import {
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  generateToken,
  hashToken,
  tokenExpiry,
} from "@/lib/tokens";
import {
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/features/users/schemas";

// Server Actions for the credentials loop. Both follow the `{ success, data, error }`
// coding standard (here: `error` for a generic top-level message, `fieldErrors` for
// per-field validation). Auth.js covers CSRF on its own routes; Server Actions are
// origin-checked by the framework, so no extra token handling is needed.

export type AuthFormState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const PASSWORD_SALT_ROUNDS = 12;

// Only same-origin, path-relative callback URLs are honored — guards against open
// redirects via a crafted `?callbackUrl=https://evil.example`.
function safeCallbackUrl(
  raw: FormDataEntryValue | null,
  locale: string,
): string {
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return `/${locale}`;
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = String(formData.get("locale") ?? "en");
  const t = await getTranslations({ locale, namespace: "Auth.errors" });

  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    messengerUrl: formData.get("messengerUrl"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString() ?? "form";
      // First issue per field wins (mirrors native form behavior).
      fieldErrors[field] ??= t(issue.message);
    }
    return { success: false, fieldErrors };
  }

  const { email, password, firstName, lastName, phone, messengerUrl } =
    parsed.data;
  const normalizedEmail = email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        phone,
        messengerUrl,
        role: "USER",
        emailVerified: null,
      },
    });
    userId = user.id;
  } catch {
    // Non-enumerating: any failure (including the P2002 unique-email collision)
    // returns the same generic message — we never confirm an email exists.
    // Fully masking duplicates depends on the email-verification flow (Session 13);
    // pre-domain this generic copy is the accepted limitation.
    return { success: false, error: t("registrationFailed") };
  }

  // Issue the verification email. Best-effort and behind the deferral gate
  // (AUTH_EMAIL_ENABLED) — it must never block registration, and verification is
  // not enforced at sign-in yet (Session 13).
  try {
    await issueEmailVerification(userId, normalizedEmail, locale);
  } catch {
    // swallow — non-blocking by design.
  }

  // Establish the session immediately so register → signed-in works end-to-end.
  // On success this throws NEXT_REDIRECT (handled by the framework); only an
  // AuthError is caught and surfaced generically.
  try {
    await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirectTo: `/${locale}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: t("genericError") };
    }
    throw error;
  }

  return { success: true };
}

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = String(formData.get("locale") ?? "en");
  const t = await getTranslations({ locale, namespace: "Auth.errors" });
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"), locale);

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  // No field-level enumeration on sign-in: any bad input is one generic message.
  if (!parsed.success) {
    return { success: false, error: t("invalidCredentials") };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: t("invalidCredentials") };
    }
    throw error;
  }

  return { success: true };
}

// Creates a single-use, hashed-at-rest verification token and (gated) emails the
// link. Any prior token for the user is cleared first so only one is ever live.
async function issueEmailVerification(
  userId: string,
  email: string,
  locale: string,
): Promise<void> {
  const { raw, hash } = generateToken();
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.create({
    data: { userId, token: hash, expires: tokenExpiry(EMAIL_VERIFICATION_TTL_MS) },
  });

  const tEmail = await getTranslations({ locale, namespace: "Auth.email" });
  const url = `${appBaseUrl()}/${locale}/verify?token=${raw}`;
  await sendEmail({
    to: email,
    subject: tEmail("verifySubject"),
    body: tEmail("verifyBody", { url }),
  });
}

export async function forgotPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = String(formData.get("locale") ?? "en");
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  // Non-enumerating: the response is ALWAYS the same generic success, regardless
  // of whether the email is well-formed or maps to an account. Work happens only
  // for a real, non-deleted user; all failures are swallowed so nothing leaks.
  if (parsed.success) {
    const email = parsed.data.email.toLowerCase();
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user && !user.deletedAt) {
        const { raw, hash } = generateToken();
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        await prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            token: hash,
            expires: tokenExpiry(PASSWORD_RESET_TTL_MS),
          },
        });

        const tEmail = await getTranslations({ locale, namespace: "Auth.email" });
        const url = `${appBaseUrl()}/${locale}/reset-password?token=${raw}`;
        await sendEmail({
          to: email,
          subject: tEmail("resetSubject"),
          body: tEmail("resetBody", { url }),
        });
      }
    } catch {
      // swallow — never reveal whether the email exists or that sending failed.
    }
  }

  return { success: true };
}

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = String(formData.get("locale") ?? "en");
  const t = await getTranslations({ locale, namespace: "Auth.errors" });

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    let topError: string | undefined;
    for (const issue of parsed.error.issues) {
      // Password problems are field-level; a bad/missing token is surfaced at the
      // top (the user can't fix it inline — they need a fresh link).
      if (issue.path[0] === "password") {
        fieldErrors.password ??= t(issue.message);
      } else {
        topError ??= t(issue.message);
      }
    }
    return {
      success: false,
      error: topError,
      fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
    };
  }

  const { token, password } = parsed.data;
  const record = await prisma.passwordResetToken.findUnique({
    where: { token: hashToken(token) },
  });

  if (!record || record.expires.getTime() < Date.now()) {
    // Purge an expired token so it can't linger; expiry and absence are the same
    // outcome to the caller.
    if (record) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
    }
    return { success: false, error: t("resetTokenInvalid") };
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  // Single-use: re-hash the password and delete the token atomically.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.delete({ where: { id: record.id } }),
  ]);

  return { success: true };
}

export async function verifyEmailAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = String(formData.get("locale") ?? "en");
  const t = await getTranslations({ locale, namespace: "Auth.verify" });
  const token = formData.get("token");

  if (typeof token !== "string" || token.length === 0) {
    return { success: false, error: t("invalid") };
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token: hashToken(token) },
  });

  if (!record || record.expires.getTime() < Date.now()) {
    if (record) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } });
    }
    return { success: false, error: t("invalid") };
  }

  // Single-use: mark the email verified and delete the token atomically.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.delete({ where: { id: record.id } }),
  ]);

  return { success: true };
}
