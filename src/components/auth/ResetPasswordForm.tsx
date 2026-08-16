"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { resetPasswordAction, type AuthFormState } from "@/actions/auth";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: AuthFormState = { success: false };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );
  const fieldErrors = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        >
          {t("resetPassword.success")}
        </p>
        <Link
          href="/signin"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          {t("resetPassword.goToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="token" value={token} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("fields.password")}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(fieldErrors.password)}
        />
        <FieldError message={fieldErrors.password} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        {pending ? t("resetPassword.submitting") : t("resetPassword.submit")}
      </button>
    </form>
  );
}
