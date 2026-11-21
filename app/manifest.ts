import type { MetadataRoute } from "next";

import { BRAND_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: "Know your max bid before you bid: verdict, repair estimate, market value and profit for salvage auction lots.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#13141c",
    theme_color: "#13141c",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Android "Share" from the Copart / IAAI app or browser → straight into FlagBid.
    share_target: { action: "/app/share", method: "GET", params: { title: "title", text: "text", url: "url" } },
    shortcuts: [
      { name: "Analyze a lot", url: "/app" },
      { name: "Watchlist", url: "/app/watchlist" },
      { name: "Bid calculator", url: "/app/calculator" },
    ],
  };
}
