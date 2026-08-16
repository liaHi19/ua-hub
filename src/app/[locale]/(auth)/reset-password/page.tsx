import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.resetPassword" });
  return { title: t("title") };
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          {t("resetPassword.title")}
        </h1>
        <p className="text-muted-foreground">{t("resetPassword.subtitle")}</p>
      </div>

      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        // No token in the link → nothing to reset. Point the user back to request one.
        <div className="flex flex-col gap-4">
          <p
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {t("resetPassword.missingToken")}
          </p>
          <Link
            href="/forgot-password"
            className="text-center text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            {t("forgotPassword.title")}
          </Link>
        </div>
      )}
    </>
  );
}
