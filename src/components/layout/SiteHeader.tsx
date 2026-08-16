import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export async function SiteHeader() {
  const t = await getTranslations("Nav");

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-9 w-9"
          />
          <span className="text-lg font-bold tracking-tight text-foreground">
            UA&nbsp;<span className="text-primary">Hub</span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-4">
          <Link
            href="/signin"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {t("signIn")}
          </Link>
          <Link href="/submit" className={buttonVariants({ size: "sm" })}>
            {t("submit")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
