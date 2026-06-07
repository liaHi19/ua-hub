import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { SignInForm } from "@/components/auth/SignInForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.signIn" });
  return { title: t("title") };
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          {t("signIn.title")}
        </h1>
        <p className="text-muted-foreground">{t("signIn.subtitle")}</p>
      </div>

      <SignInForm callbackUrl={callbackUrl} />

      <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <Link
          href="/forgot-password"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          {t("signIn.forgotPassword")}
        </Link>
        <p>
          {t("signIn.noAccount")}{" "}
          <Link
            href="/register"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            {t("register.title")}
          </Link>
        </p>
      </div>
    </>
  );
}
