"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { getTranslations } from "next-intl/server";

import { signIn } from "@/features/auth/auth";
import { prisma } from "@/lib/prisma";
import { registerSchema, signInSchema } from "@/features/users/schemas";

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
  const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  try {
    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone,
        messengerUrl,
        role: "USER",
        emailVerified: null,
      },
    });
  } catch {
    // Non-enumerating: any failure (including the P2002 unique-email collision)
    // returns the same generic message — we never confirm an email exists.
    // Fully masking duplicates depends on the email-verification flow (Session 13);
    // pre-domain this generic copy is the accepted limitation.
    return { success: false, error: t("registrationFailed") };
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
