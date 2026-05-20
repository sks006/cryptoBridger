import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import ErudaLoader from "@/components/ErudaLoader";
import ChromeToPhantomRedirect from "@/components/ChromeToPhantomRedirect";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  metadataBase: new URL("https://card-bridger.vercel.app/"),
  title: {
    default: "CardBridger Finance — The Next Gen Solana Crypto Card",
    template: "%s | CardBridger Finance"
  },
  description: "Spend your crypto assets globally without selling them. Powered by Solana and Jupiter DEX for real-time liquidity and best-rate swaps.",
  keywords: ["Solana", "Crypto Card", "DeFi", "Jupiter DEX", "CardBridger", "Blockchain Payments", "Cashback"],
  authors: [{ name: "CardBridger Team" }],
  creator: "CardBridger Finance",
  publisher: "CardBridger Finance",
  openGraph: {
    title: "CardBridger Finance",
    description: "The ultimate Solana-powered crypto card. Spend, earn cashback, and keep your assets.",
    url: "https://card-bridger.vercel.app/",
    siteName: "CardBridger Finance",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CardBridger Finance",
    description: "Spend your crypto without selling. The ultimate Solana-powered crypto card.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  
  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning={true}
      >
        <Providers>
          <ErudaLoader />
                    <ChromeToPhantomRedirect />

          {children}
        </Providers>
      </body>
    </html>
  );
}
