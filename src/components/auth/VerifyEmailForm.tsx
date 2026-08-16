"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { verifyEmailAction, type AuthFormState } from "@/actions/auth";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: AuthFormState = { success: false };

// Verification is a confirm-button POST rather than a bare GET on purpose: the
// link travels through email and chat clients whose preview crawlers (Telegram /
// WhatsApp / Signal) would otherwise prefetch the URL and burn the single-use
// token before the user ever clicks. A human click is required to consume it.
export function VerifyEmailForm({ token }: { token: string }) {
  const t = useTranslations("Auth.verify");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    verifyEmailAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
        >
          {t("success")}
        </p>
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {t("goHome")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
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

      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
