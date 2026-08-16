"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { forgotPasswordAction, type AuthFormState } from "@/actions/auth";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: AuthFormState = { success: false };

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  // Non-enumerating: the action always returns success, so we show the same
  // generic confirmation regardless of whether the email maps to an account.
  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
      >
        {t("forgotPassword.sent")}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("fields.email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        {pending ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
      </button>
    </form>
  );
}
