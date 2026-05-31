import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Public surfaces are served under a locale prefix. English is the default
  // and the fallback; admin + API are excluded from localization (see middleware).
  locales: ["en", "uk"],
  defaultLocale: "en",
});
