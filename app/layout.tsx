import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "AuctionPulse AI — know your max bid before you bid", template: "%s · AuctionPulse AI" },
  description:
    "Paste a Copart, IAAI or Bid.cars link and get an investor report: verdict, maximum bid, itemized repair estimate, market value, profit and risks.",
  applicationName: "AuctionPulse AI",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "AuctionPulse", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#16181d" },
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
