import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.verify" });
  return { title: t("title") };
}

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth.verify");

  return (
    <>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {token ? (
        // The token is only consumed once the user clicks confirm (POST) — never
        // on this GET render — so preview crawlers can't burn the single-use token.
        <VerifyEmailForm token={token} />
      ) : (
        <div className="flex flex-col gap-4">
          <p
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {t("invalid")}
          </p>
          <Link
            href="/"
            className="text-center text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            {t("goHome")}
          </Link>
        </div>
      )}
    </>
  );
}
