import { z } from "zod";

import { isHttpsUrl } from "@/lib/validate-url";

// Validation schemas for the credentials loop (Session 3b).
//
// Messages are stable i18n *keys*, not user-facing copy: server actions map each
// issue's message through `getTranslations("Auth.errors")` so EN/UK validation text
// stays in the message catalogs (messages/{en,uk}.json), never hard-coded here.

// Empty form fields arrive as "" rather than absent; normalize "" → undefined so the
// optional contact fields read as "not provided" in the refinement below.
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const registerSchema = z
  .object({
    email: z.string().trim().min(1, "emailRequired").email("emailInvalid"),
    // Basic strength: long enough, and not a single character class. Full policy
    // (breach lists etc.) is out of scope; this just blocks the obvious-weak cases.
    password: z
      .string()
      .min(8, "passwordTooShort")
      .regex(/[a-zA-Z]/, "passwordWeak")
      .regex(/[0-9]/, "passwordWeak"),
    firstName: z.string().trim().min(1, "firstNameRequired"),
    lastName: z.string().trim().min(1, "lastNameRequired"),
    phone: optionalText,
    messengerUrl: optionalText,
  })
  .superRefine((data, ctx) => {
    // At least one admin-verification contact channel is required.
    if (!data.phone && !data.messengerUrl) {
      ctx.addIssue({
        code: "custom",
        message: "contactRequired",
        path: ["contact"],
      });
    }
    // messengerUrl, when given, must be https:// (privacy invariant).
    if (data.messengerUrl && !isHttpsUrl(data.messengerUrl)) {
      ctx.addIssue({
        code: "custom",
        message: "messengerUrlInvalid",
        path: ["messengerUrl"],
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const signInSchema = z.object({
  email: z.string().trim().min(1, "emailRequired").email("emailInvalid"),
  password: z.string().min(1, "passwordRequired"),
});

export type SignInInput = z.infer<typeof signInSchema>;
