import localFont from "next/font/local";

// One family carries the whole UI — headings, body, and the OG card (Session
// 12 inlines this same file). Cyrillic + Latin, SIL OFL, self-hosted in
// /public/fonts. Single variable TTF (weight axis 100–900) keeps the asset
// count down.
export const notoSerif = localFont({
  src: "../../public/fonts/NotoSerif-Variable.ttf",
  weight: "100 900",
  style: "normal",
  variable: "--font-noto-serif",
  display: "swap",
});
