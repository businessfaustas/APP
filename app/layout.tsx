import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { BRAND_NAME } from "@/lib/brand";
import { appUrl } from "@/lib/config/deployment";
import { getMessages } from "@/lib/i18n/messages";
import { getLocale, getT } from "@/lib/i18n/server";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    metadataBase: new URL(appUrl()),
    title: { default: t("site.metaTitle"), template: `%s · ${BRAND_NAME}` },
    description: t("site.metaDescription"),
    applicationName: BRAND_NAME,
    openGraph: {
      type: "website",
      siteName: BRAND_NAME,
      title: t("site.metaTitle"),
      description: t("site.metaDescription"),
      locale: t.locale === "lt" ? "lt_LT" : "en_US",
    },
    twitter: { card: "summary_large_image", title: t("site.metaTitle"), description: t("site.metaDescription") },
    manifest: "/manifest.webmanifest",
    icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: BRAND_NAME, statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#13141c" },
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
