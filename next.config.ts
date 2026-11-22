import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"} https://js.stripe.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "frame-src https://js.stripe.com https://checkout.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "@react-pdf/renderer", "zipcodes", "pg"],
  async headers() {
    const noindex = { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" };
    const longCache = { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" };
    // Staging and preview deployments must never be indexed (and neither should the vercel.app address once a real domain is live).
    const staging = process.env.VERCEL_ENV === "preview" || process.env.APP_ENV === "staging";
    return [
      { source: "/:path*", headers: staging ? [...securityHeaders, noindex] : securityHeaders },
      // Private pages and one-off links: never in search results, never cached by a shared proxy.
      ...["/app/:path*", "/admin/:path*", "/r/:path*", "/welcome", "/login", "/unsubscribe", "/api/:path*"].map((source) => ({
        source,
        headers: [noindex, { key: "Cache-Control", value: "private, no-store" }],
      })),
      // Static pictures never change under the same name: let browsers and the CDN keep them.
      ...["/cars/:path*", "/demo-photos/:path*", "/icons/:path*"].map((source) => ({ source, headers: [longCache] })),
    ];
  },
};

export default nextConfig;
