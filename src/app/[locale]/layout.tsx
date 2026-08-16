import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { notoSerif } from "@/lib/fonts";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site" });
  return {
    title: t("name"),
    description: t("tagline"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Enables static rendering for descendant server components.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={notoSerif.variable}>
      <body className="flex min-h-dvh flex-col antialiased">
        <NextIntlClientProvider>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
