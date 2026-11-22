import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/config/deployment";

/** Public pages only. `lastModified` is the date the page's content last meaningfully changed. */
const PAGES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly"; lastModified: string }[] = [
  { path: "", priority: 1, changeFrequency: "weekly", lastModified: "2026-11-22" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-11-22" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly", lastModified: "2026-11-22" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly", lastModified: "2026-11-22" },
  { path: "/dmca", priority: 0.2, changeFrequency: "yearly", lastModified: "2026-11-22" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return PAGES.map((p) => ({ url: `${base}${p.path}`, lastModified: new Date(p.lastModified), changeFrequency: p.changeFrequency, priority: p.priority }));
}
