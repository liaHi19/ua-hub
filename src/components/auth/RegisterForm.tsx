"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { registerAction, type AuthFormState } from "@/actions/auth";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: AuthFormState = { success: false };

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

export function RegisterForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t("fields.email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(fieldErrors.email)}
        />
        <FieldError message={fieldErrors.email} />
      </div>

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

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">{t("fields.firstName")}</Label>
          <Input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            aria-invalid={Boolean(fieldErrors.firstName)}
          />
          <FieldError message={fieldErrors.firstName} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">{t("fields.lastName")}</Label>
          <Input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            aria-invalid={Boolean(fieldErrors.lastName)}
          />
          <FieldError message={fieldErrors.lastName} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-md border border-border p-4">
        <legend className="px-1 text-sm font-medium">
          {t("contact.legend")}
        </legend>
        <p className="text-sm text-muted-foreground">{t("contact.note")}</p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t("fields.phone")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(fieldErrors.phone)}
          />
          <FieldError message={fieldErrors.phone} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="messengerUrl">{t("fields.messengerUrl")}</Label>
          <Input
            id="messengerUrl"
            name="messengerUrl"
            type="url"
            inputMode="url"
            placeholder="https://"
            aria-invalid={Boolean(fieldErrors.messengerUrl)}
          />
          <FieldError message={fieldErrors.messengerUrl} />
        </div>

        <FieldError message={fieldErrors.contact} />
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ size: "lg" }), "w-full")}
      >
        {pending ? t("register.submitting") : t("register.submit")}
      </button>
    </form>
  );
}
