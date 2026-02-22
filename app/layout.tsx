import "./globals.css";
import type { Metadata } from "next";
import { Baloo_2, Bungee } from "next/font/google";

const bodyFont = Baloo_2({
  subsets: ["latin"],
  variable: "--font-body"
});

const displayFont = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Math Tug-of-War",
  description: "Real-time two-player arithmetic tug-of-war"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
