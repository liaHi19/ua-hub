import { Inter } from "next/font/google";
import localFont from "next/font/local";

// Body / UI — Inter (Cyrillic-capable) via next/font (self-hosted at build).
export const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

// Titles + OG card — Noto Serif (Cyrillic + Latin, SIL OFL), self-hosted in
// /public/fonts so the OG image handler (Session 12) can inline the same file.
// Single variable TTF (weight axis 100–900) keeps the asset count down.
export const notoSerif = localFont({
  src: "../../public/fonts/NotoSerif-Variable.ttf",
  weight: "100 900",
  style: "normal",
  variable: "--font-noto-serif",
  display: "swap",
});
