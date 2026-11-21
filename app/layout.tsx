import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { BRAND_NAME } from "@/lib/brand";
import { getMessages } from "@/lib/i18n/messages";
import { getLocale, getT } from "@/lib/i18n/server";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t("site.metaTitle"), template: `%s · ${BRAND_NAME}` },
    description: t("site.metaDescription"),
    applicationName: BRAND_NAME,
    manifest: "/manifest.webmanifest",
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: BRAND_NAME, statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1512" },
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        <Providers locale={locale} messages={getMessages(locale)}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
