import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lamyt Finance — Crypto Card Powered by Solana",
  description:
    "Spend your crypto without selling it. Get a Solana-powered crypto card with up to 2% cashback, credit mode, and daily interest on your collateral.",
  keywords: [
    "crypto card",
    "solana",
    "defi",
    "credit line",
    "cashback",
    "jupiter",
  ],
  openGraph: {
    title: "Lamyt Finance — Crypto Card",
    description: "Spend without selling. Earn while you hold.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
