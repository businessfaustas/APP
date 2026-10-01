import "server-only";

import { refundAnalysis } from "@/lib/billing/credits";
import { env, features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { removePrefix } from "@/lib/storage/photos";
import { formatDateTime } from "@/lib/utils";

/** Sends watchlist reminders that are due (email via Resend when configured). */
export async function sendDueReminders(now: Date = new Date()): Promise<{ sent: number; skipped: number }> {
  const due = await prisma.watchlistItem.findMany({
    where: { remindAt: { lte: now }, remindedAt: null },
    include: { user: true, listing: true },
    take: 200,
  });
  let sent = 0;
  let skipped = 0;
  for (const item of due) {
    const l = item.listing;
    const title = [l.year, l.make, l.model].filter(Boolean).join(" ") || "Your saved lot";
    if (features.email()) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(env().RESEND_API_KEY);
        const link = `${env().NEXT_PUBLIC_APP_URL}${item.analysisId ? `/app/analyses/${item.analysisId}` : "/app/watchlist"}`;
        await resend.emails.send({
          from: env().EMAIL_FROM,
          to: item.user.email,
          subject: `Sale reminder: ${title}`,
          text: [
            `${title} (${l.source} lot ${l.lotNumber ?? "—"}) sells ${l.saleDate ? `on ${formatDateTime(l.saleDate)}` : "soon"}.`,
            item.myMaxBid ? `Your max bid: $${item.myMaxBid.toLocaleString("en-US")}` : "",
            `Report: ${link}`,
          ]
            .filter(Boolean)
            .join("\n"),
        });
        sent++;
      } catch (err) {
        console.error("Reminder email failed", err);
        skipped++;
        continue;
      }
    } else {
      skipped++;
    }
    await prisma.watchlistItem.update({ where: { id: item.id }, data: { remindedAt: now } });
  }
  return { sent, skipped };
}

/** Daily: expire stale NEEDS_INPUT runs, delete photos older than 90 days, prune caches. */
export async function runMaintenance(now: Date = new Date()): Promise<Record<string, number>> {
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const stale = await prisma.analysis.findMany({
    where: { status: { in: ["RUNNING", "QUEUED"] }, createdAt: { lt: dayAgo } },
    select: { id: true },
  });
  for (const a of stale) {
    await prisma.analysis.update({ where: { id: a.id }, data: { status: "FAILED", error: "Timed out waiting for listing details." } });
    await refundAnalysis(a.id);
  }

  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oldListings = await prisma.listing.findMany({
    where: { fetchedAt: { lt: cutoff }, photos: { some: { storagePath: { not: null } } } },
    select: { id: true },
    take: 500,
  });
  for (const l of oldListings) {
    await removePrefix(`listings/${l.id}`).catch((err: unknown) => console.error(err));
    await prisma.listingPhoto.deleteMany({ where: { listingId: l.id, storagePath: { startsWith: "listings/" } } });
  }

  const caches = await prisma.apiCache.deleteMany({ where: { expiresAt: { lt: now } } });
  const hits = await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: dayAgo } } });
  return { expired: stale.length, photoSetsDeleted: oldListings.length, cachesPruned: caches.count, rateLimitPruned: hits.count };
}
