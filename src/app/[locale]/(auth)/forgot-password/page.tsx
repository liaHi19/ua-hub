import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.forgotPassword" });
  return { title: t("title") };
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          {t("forgotPassword.title")}
        </h1>
        <p className="text-muted-foreground">{t("forgotPassword.subtitle")}</p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/signin"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          {t("forgotPassword.backToSignIn")}
        </Link>
      </p>
    </>
  );
}
