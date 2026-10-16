import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const barlow = Barlow({ subsets: ["latin"], variable: "--font-barlow", display: "swap", weight: ["400", "500", "600"] });
const condensed = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  display: "swap",
  weight: ["600", "700"],
});
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Trade-in appraisal · Larkspur Motors", template: "%s · Larkspur Motors" },
  description: "What is your trade worth? An instant estimate by VIN, then a firm offer from the Larkspur Motors desk.",
};

export const viewport: Viewport = { themeColor: "#14574a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${barlow.variable} ${condensed.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
