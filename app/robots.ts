import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/config/deployment";

/** Pages that belong to a signed-in person, or are one-off links, never belong in search results. */
const PRIVATE = ["/app/", "/admin/", "/api/", "/r/", "/welcome", "/login", "/unsubscribe"];
/** Search and answer engines that should be able to read the public pages and cite them. */
const ANSWER_ENGINES = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"];

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();
  // Staging, previews and the temporary vercel.app address are kept out of search engines entirely.
  if (process.env.VERCEL_ENV === "preview" || process.env.APP_ENV === "staging") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: ANSWER_ENGINES, allow: ["/", "/llms.txt"], disallow: PRIVATE },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
