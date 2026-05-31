import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Locale-aware navigation helpers. Use these instead of next/link + next/navigation
// on public surfaces so the active locale prefix is preserved.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
