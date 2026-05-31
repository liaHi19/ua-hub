import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Enables static rendering for this server component.
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="font-serif text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {t("heading")}
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">{t("subheading")}</p>
      <Link href="/submit" className={buttonVariants({ size: "lg" })}>
        {t("cta")}
      </Link>

      {/* Cyrillic rendering check — Noto Serif must show real glyphs (no tofu). */}
      <p className="font-serif text-2xl text-accent" lang="uk">
        Вечір української поезії
      </p>
    </main>
  );
}
