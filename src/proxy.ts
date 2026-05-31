import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Localize everything EXCEPT /api, /admin, Next internals, and files with an
  // extension. Admin + API stay un-localized (English-only) per the design.
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
